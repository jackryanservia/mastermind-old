pragma circom 2.0.0;

// Pull n * n into its own variable if possible without unconstraining

template VerifyRegion(n, Sum, Product) {
  signal input a[n * n];
  signal sum[n * n + 1];
  signal product[n * n + 1];

  sum[0] <== 0;
  product[0] <== 1;

  for (var i = 0; i < n * n; i++) {
    sum[i + 1] <== sum[i] + a[i];
  }

  for (var i = 0; i < n * n; i++) {
    product[i + 1] <== product[i] * a[i];
  }

  sum[n * n] === Sum;
  product[n * n] === Product;
}

template VerifySudoku(n, Sum, Product) {

  signal input a[n * n][n * n];
  component region[3][n * n];

  // Check rows
  for (var i = 0; i < n * n; i++) {
    region[0][i] = VerifyRegion(n, Sum, Product);
    for (var j = 0; j < n * n; j++) {
      region[0][i].a[j] <== a[i][j];
    }
  }

  // Check columns
  for (var i = 0; i < n * n; i++) {
    region[1][i] = VerifyRegion(n, Sum, Product);
    for (var j = 0; j < n * n; j++) {
      region[1][i].a[j] <== a[j][i];
    }
  }

  // This might not be fully constrained!!! Check it again when you are less stupid.
  // Maybe write similar code is python or else explore Circom logging.

  for (var i = 0; i < n; i++) {
    for (var j = 0; j < n; j++) {
      region[2][n * i + j] = VerifyRegion(n, Sum, Product);
      // Traverse 3 * 3 region
      for (var k = 0; k < n; k++) {
        for (var l = 0; l < n; l++) {
          region[2][n * i + j].a[n * k + l] <== a[n * i + k][n * j + l];
        }
      }
    }
  }
}

// Refactor this, you don't need to pass Sum and Product here. Extract into another template
template VerifyInput(n, Sum, Product) {

  // Check that every non-zero value in unsolved corresponds to value in solution

  signal input unsolved[n * n][n * n];
  signal input solved[n * n][n * n];

  signal sparseSolved[n * n][n * n];
  signal shouldBeZeros[n * n][n * n];

  component verify = VerifySudoku(n, Sum, Product);

  for (var i = 0; i < n * n; i++) {
    for (var j = 0; j < n * n; j++) {
      sparseSolved[i][j] <== solved[i][j] - unsolved[i][j];
      shouldBeZeros[i][j] <== sparseSolved[i][j] * unsolved[i][j];
      shouldBeZeros[i][j] === 0;

      verify.a[i][j] <== solved[i][j];
    }
  }
}

// component main = VerifySudoku(3, 50, 665280);
component main {public [unsolved]} = VerifyInput(3, 50, 665280);
