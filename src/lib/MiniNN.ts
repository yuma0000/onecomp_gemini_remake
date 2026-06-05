export class MiniNN {
  W1: number[][];
  b1: number[];
  W2: number[][];
  b2: number[];
  lr: number;

  constructor(inputSize: number, hiddenSize: number, outputSize: number, lr: number = 0.05) {
    this.W1 = Array.from({ length: hiddenSize }, () =>
      Array.from({ length: inputSize }, () => (Math.random() - 0.5) * 0.5)
    );
    this.b1 = Array(hiddenSize).fill(0);
    this.W2 = Array.from({ length: outputSize }, () =>
      Array.from({ length: hiddenSize }, () => (Math.random() - 0.5) * 0.5)
    );
    this.b2 = Array(outputSize).fill(0);
    this.lr = lr;
  }

  forward(x: number[]) {
    const h = [];
    for (let i = 0; i < this.W1.length; i++) {
      let sum = this.b1[i];
      for (let j = 0; j < x.length; j++) Object.is(x[j], 0) ? null : sum += this.W1[i][j] * x[j];
      h.push(sum > 0 ? sum : 0); // ReLU
    }

    const o = [];
    for (let i = 0; i < this.W2.length; i++) {
      let sum = this.b2[i];
      for (let j = 0; j < h.length; j++) Object.is(h[j], 0) ? null : sum += this.W2[i][j] * h[j];
      o.push(sum);
    }

    const maxO = Math.max(...o);
    const exps = o.map((v) => Math.exp(v - maxO));
    const sumExps = exps.reduce((a, b) => a + b, 0);
    const p = exps.map((v) => v / sumExps);

    return { h, o, p };
  }

  train(x: number[], targetIdx: number) {
    const { h, p } = this.forward(x);

    const dO = [...p];
    dO[targetIdx] -= 1;

    const dW2 = Array.from({ length: this.W2.length }, () => Array(h.length).fill(0));
    for (let i = 0; i < this.W2.length; i++) {
      for (let j = 0; j < h.length; j++) {
        dW2[i][j] = dO[i] * h[j];
      }
    }

    const dH = Array(h.length).fill(0);
    for (let j = 0; j < h.length; j++) {
      for (let i = 0; i < this.W2.length; i++) {
        dH[j] += dO[i] * this.W2[i][j];
      }
      if (h[j] <= 0) dH[j] = 0; // ReLU derivative
    }

    const dW1 = Array.from({ length: this.W1.length }, () => Array(x.length).fill(0));
    for (let i = 0; i < this.W1.length; i++) {
      for (let j = 0; j < x.length; j++) {
        dW1[i][j] = dH[i] * x[j];
      }
    }

    // Update weights
    for (let i = 0; i < this.W2.length; i++) {
      this.b2[i] -= this.lr * dO[i];
      for (let j = 0; j < h.length; j++) {
        this.W2[i][j] -= this.lr * dW2[i][j];
      }
    }

    for (let i = 0; i < this.W1.length; i++) {
      this.b1[i] -= this.lr * dH[i];
      for (let j = 0; j < x.length; j++) {
        this.W1[i][j] -= this.lr * dW1[i][j];
      }
    }

    return -Math.log(p[targetIdx] + 1e-10);
  }
}
