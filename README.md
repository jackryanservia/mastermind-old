# Mina Snapp: Mastermind

## Hello O(1)!

I'm sorry that my publishHint method uses call data and console logs instead of reading from and publishing to chain state. I ended up spending too long trying trying to figure out how to do things "the right way" and I ran out of time. I'm also sorry that the publishHint method is so convoluted. I tried to implement it in a few different ways, but I felt most confident that this way was fully constrained. Finally, I've included a sudoku verifier that I made in Circom a couple of days ago. Feel free to ignore it if it isn't relevant to this bootcamp, but I figured I would included it just to demonstrate that I can design more elegant circuits once I get familiar with the tools I'm using. It verifies that a region in a sudoku board includes one through nine exactly once by making sure that the numbers in each region have a sum of 150 and have a product of 665280. I use the numbers (1, 2, 3, 4, 5, 7, 8, 9, 11) in place of one through nine because they satisfy a system of equations that ensure there is no way to get the correct sum and product other than including (1, 2, 3, 4, 5, 7, 8, 9, 11) exactly once. I check that the solved sudoku corresponds to the unsolved sudoku by checking that (solved - unsolved) * unsolved == 0 for every cell in the puzzle. Anyways, thank you so much for the bootcamp! It was great! If I get into the Snapp Builders Program I promise to write more finished and less tornadoy code! :))

This template uses TypeScript.

## How to build

```sh
npm run build
```

## How to run tests

```sh
npm run test
npm run testw # watch mode
```

## How to run coverage

```sh
npm run coverage
```

## License

[Apache-2.0](LICENSE)
