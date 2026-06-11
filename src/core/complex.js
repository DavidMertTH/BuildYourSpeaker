export class Complex {
  constructor(re = 0, im = 0) {
    this.re = re;
    this.im = im;
  }

  add(other) {
    other = asComplex(other);
    return new Complex(this.re + other.re, this.im + other.im);
  }

  sub(other) {
    other = asComplex(other);
    return new Complex(this.re - other.re, this.im - other.im);
  }

  mul(other) {
    other = asComplex(other);
    return new Complex(this.re * other.re - this.im * other.im, this.re * other.im + this.im * other.re);
  }

  div(other) {
    other = asComplex(other);
    const denom = other.re * other.re + other.im * other.im;
    return new Complex(
      (this.re * other.re + this.im * other.im) / denom,
      (this.im * other.re - this.re * other.im) / denom,
    );
  }

  neg() {
    return new Complex(-this.re, -this.im);
  }

  abs() {
    return Math.hypot(this.re, this.im);
  }

  phase() {
    return Math.atan2(this.im, this.re);
  }
}

export const C = (re = 0, im = 0) => new Complex(re, im);

export function asComplex(value) {
  return value instanceof Complex ? value : new Complex(value, 0);
}

export function jOmega(frequency) {
  return new Complex(0, 2 * Math.PI * frequency);
}

export function solveLinearSystem(matrix, rhs) {
  const n = rhs.length;
  const a = matrix.map((row, i) => [...row.map(asComplex), asComplex(rhs[i])]);

  for (let col = 0; col < n; col += 1) {
    let pivot = col;
    for (let row = col + 1; row < n; row += 1) {
      if (a[row][col].abs() > a[pivot][col].abs()) {
        pivot = row;
      }
    }

    if (a[pivot][col].abs() < 1e-18) {
      throw new Error("Singular complex system");
    }

    if (pivot !== col) {
      [a[pivot], a[col]] = [a[col], a[pivot]];
    }

    const pivotValue = a[col][col];
    for (let item = col; item <= n; item += 1) {
      a[col][item] = a[col][item].div(pivotValue);
    }

    for (let row = 0; row < n; row += 1) {
      if (row === col) continue;
      const factor = a[row][col];
      for (let item = col; item <= n; item += 1) {
        a[row][item] = a[row][item].sub(factor.mul(a[col][item]));
      }
    }
  }

  return a.map((row) => row[n]);
}

export function unwrapPhase(phases) {
  if (phases.length === 0) return [];
  const output = [phases[0]];
  let offset = 0;

  for (let index = 1; index < phases.length; index += 1) {
    const delta = phases[index] - phases[index - 1];
    if (delta > Math.PI) offset -= 2 * Math.PI;
    if (delta < -Math.PI) offset += 2 * Math.PI;
    output.push(phases[index] + offset);
  }

  return output;
}
