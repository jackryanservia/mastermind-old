import {
  Field,
  PublicKey,
  SmartContract,
  state,
  State,
  method,
  UInt64,
  Poseidon,
  isReady,
  Mina,
  PrivateKey,
  Party,
  Int64,
  Bool,
  Signature,
  UInt32,
  Circuit,
  shutdown,
} from 'snarkyjs';

function codeToField(code: number[]): Field {
  const integerCode = code.join('');
  const fieldCode = new Field(integerCode);
  return fieldCode;
}

function codeToUInt(code: number[]): UInt32 {
  const integerCode = Number(code.join(''));
  const uintCode = new UInt32(new Field(integerCode));
  return uintCode;
}

function hashField(field: Field, salt: Field): Field {
  const saltyField = field.add(salt);
  return Poseidon.hash([saltyField]);
}

export default class Mastermind extends SmartContract {
  // Hash of secret code
  @state(Field) secretHash: State<Field>;
  // Salt for secretHash (6^4 = 1,296, thats a small number!)
  @state(Field) secretHashSalt: State<Field>;
  // Last guess
  @state(Field) lastGuess: State<Field>;
  // Last hint
  @state(Field) lastHint: State<Field>;
  // Whos turn? (false -> generator | true -> guesser)
  @state(Bool) isGuessersTurn: State<Bool>;
  // Is game won?
  @state(Bool) gameWon: State<Bool>;

  codeGenerator: PublicKey;

  codeGuesser: PublicKey;

  constructor(
    initialBalance: UInt64,
    address: PublicKey,
    codeGenerator: PublicKey,
    codeGuesser: PublicKey,
    secret: Field
  ) {
    super(address);
    const secretCode = secret;
    const secretCodeSalt = Field.random();

    this.balance.addInPlace(initialBalance);
    this.secretHashSalt = State.init(secretCodeSalt);
    this.secretHash = State.init(hashField(secretCode, secretCodeSalt));
    this.lastGuess = State.init(Field.zero);
    this.lastHint = State.init(Field.zero);
    this.gameWon = State.init(Bool(false));
    this.isGuessersTurn = State.init(Bool(true));

    this.codeGenerator = codeGenerator;
    this.codeGuesser = codeGuesser;
    console.log('secret code:');
    console.log(secret.toString());
  }

  @method async checkCode(secret: Field) {
    const secretCode = secret;
    const contractSecretCodeHash = await this.secretHash.get();
    const secretCodeSalt = await this.secretHashSalt.get();
    const guessSecretCodeHash = hashField(secretCode, secretCodeSalt);
    contractSecretCodeHash.assertEquals(guessSecretCodeHash);
    console.log('guessed code:');
    console.log(secret.toString());
  }

  @method async publishGuess(
    pubkey: PublicKey,
    signature: Signature,
    guess: Field
  ) {
    // 1.) Abort if game won
    const finished = await this.gameWon.get();
    finished.assertEquals(false);

    console.log('game is not won');
    // 2.) Ensure caller is proper

    // Ensure player is codeGuesser
    pubkey.equals(this.codeGuesser).assertEquals(true);

    console.log('Player is code guesser');

    // Ensure player knows private key of guesser
    signature.verify(pubkey, [guess]).assertEquals(true);

    console.log('Signature good');

    // 3.) Enusure that it is gussers turn
    const isGuessersTurn = await this.isGuessersTurn.get();
    isGuessersTurn.assertEquals(true);

    console.log("It's guessers turn!");

    // Pass turn to code generater
    this.isGuessersTurn.set(Bool(false));

    this.lastGuess.set(guess);

    console.log('dood!');
  }

  @method async publishHint(guess: UInt32, code: UInt32) {
    // I am sorry that this does not use take values from chain state or commit hints to chain state
    // I spent too much time trying to figure out how to do things "correctly" and ran out of time
    // I'm also sorry that this is so convuluted, I had a lot of trouble figuring out how to
    // fully constrain my logic and ended up with this, which I think is fully constrained but also
    // could probably be done much more simply
    let blackPegs = [
      UInt32.zero,
      UInt32.zero,
      UInt32.zero,
      UInt32.zero,
      UInt32.zero,
    ];
    let whitePegs = [
      UInt32.zero,
      UInt32.zero,
      UInt32.zero,
      UInt32.zero,
      UInt32.zero,
    ];
    // Add greater than less than checks for input values of this method

    for (let i = 0; i < 4; i++) {
      const place = Math.pow(10, i);
      const leftOfPlace = Math.pow(10, i + 1);
      const finalGuess = guess
        .div(place)
        .mul(place)
        .sub(guess.div(leftOfPlace).mul(leftOfPlace))
        .div(place);
      const finalCode = code
        .div(place)
        .mul(place)
        .sub(code.div(leftOfPlace).mul(leftOfPlace))
        .div(place);
      blackPegs[i + 1] = Circuit.if(
        finalCode.equals(finalGuess),
        blackPegs[i].add(1),
        blackPegs[i].add(0)
      );

      let hasElement = Bool(false);
      for (let j = 0; j < 4; j++) {
        const selectorPlace = Math.pow(10, j);
        const leftOfSelectorPlace = Math.pow(10, j + 1);
        const finalSelection = code
          .div(selectorPlace)
          .mul(selectorPlace)
          .sub(code.div(leftOfSelectorPlace).mul(leftOfSelectorPlace))
          .div(selectorPlace);
        hasElement = Circuit.if(
          finalGuess.equals(finalSelection),
          Bool(true),
          hasElement
        );
      }
      whitePegs[i + 1] = Circuit.if(
        hasElement,
        whitePegs[i].add(1),
        whitePegs[i].add(0)
      );
    }
    console.log('secret code');
    console.log(code.toString());
    console.log('guessed code');
    console.log(guess.toString());
    console.log('Number of black pegs');
    console.log(blackPegs[4].toString());
    console.log('Number of white pegs');
    console.log(whitePegs[4].toString());
  }
}

export async function main() {
  await isReady;

  const Local = Mina.LocalBlockchain();
  Mina.setActiveInstance(Local);

  const codeGenerator = Local.testAccounts[0].privateKey;
  const codeGuesser = Local.testAccounts[1].privateKey;

  const snappPrivkey = PrivateKey.random();
  const snappPubkey = snappPrivkey.toPublicKey();

  // Create a new instance of the contract
  console.log('\n\n====== DEPLOYING ======\n\n');
  let snappInstance: Mastermind;
  await Mina.transaction(codeGenerator, async () => {
    // player2 sends 1000000000 to the new snapp account
    const amount = UInt64.fromNumber(1000000000);
    const p = await Party.createSigned(codeGuesser);
    p.body.delta = Int64.fromUnsigned(amount).neg();

    snappInstance = new Mastermind(
      amount,
      snappPubkey,
      codeGenerator.toPublicKey(),
      codeGuesser.toPublicKey(),
      codeToField([1, 2, 3, 4])
    );
  })
    .send()
    .wait();
  console.log('contract created');

  console.log('\n\n====== FIRST MOVE ======\n\n');
  await Mina.transaction(codeGuesser, async () => {
    await snappInstance.checkCode(codeToField([1, 2, 3, 4]));
  })
    .send()
    .wait();
  console.log('Code is correct');

  console.log('\n\n====== CREATE GUESS ======\n\n');
  const fieldCode = codeToField([1, 2, 3, 4]);
  const signature = Signature.create(codeGuesser, [fieldCode]);
  await Mina.transaction(codeGuesser, async () => {
    await snappInstance
      .publishGuess(codeGuesser.toPublicKey(), signature, fieldCode)
      .catch((e) => console.log(e));
  })
    .send()
    .wait();
  console.log('guess created');

  console.log('\n\n====== GUESS 1131 ======\n\n');
  await Mina.transaction(codeGuesser, async () => {
    await snappInstance.publishHint(
      codeToUInt([1, 1, 3, 1]),
      codeToUInt([1, 1, 1, 3])
    );
  })
    .send()
    .wait();

  console.log('\n\n====== GUESS 1113 ======\n\n');
  await Mina.transaction(codeGuesser, async () => {
    await snappInstance.publishHint(
      codeToUInt([1, 1, 1, 3]),
      codeToUInt([1, 1, 1, 3])
    );
  })
    .send()
    .wait();

  console.log('\n\n====== GUESS 4444 ======\n\n');
  await Mina.transaction(codeGuesser, async () => {
    await snappInstance.publishHint(
      codeToUInt([4, 4, 4, 4]),
      codeToUInt([1, 1, 1, 3])
    );
  })
    .send()
    .wait();
}
main();
shutdown();
