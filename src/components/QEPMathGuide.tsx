import { Sigma, FunctionSquare, ArrowRight, BrainCircuit, Lightbulb, Calculator } from "lucide-react";

export function QEPMathGuide() {
  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-16">
      <div className="text-center space-y-4 mb-12">
        <h2 className="text-3xl font-bold text-slate-800">QEPの数式と計算ロジック</h2>
        <p className="text-slate-600">
          なぜQEP（Quantization Error Propagation）が極低ビット圧縮において画期的なのか。
          その背後にある数式と、直感的な具体例で解説します。
        </p>
      </div>

      {/* standard GPTQ */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center gap-3">
          <FunctionSquare className="w-5 h-5 text-slate-600" />
          <h3 className="text-lg font-bold text-slate-800">1. 従来手法 (標準GPTQ) の限界</h3>
        </div>
        <div className="p-6 space-y-6">
          <p className="text-slate-700">
            従来のGPTQでは、各層を独立して量子化します。層 <span className="font-serif italic text-blue-600">l</span> における目的関数は以下の通りです。
          </p>
          
          <div className="flex justify-center bg-slate-800 rounded-xl p-6 shadow-inner my-6">
            <div className="text-white font-serif text-2xl tracking-wider">
              <span className="text-slate-400 text-lg mr-4">arg min</span>
              || <span className="text-blue-400">W</span><span className="text-teal-400">X</span> - <span className="text-blue-400">Ŵ</span><span className="text-teal-400">X</span> ||<sub className="text-sm">2</sub><sup className="text-sm border-slate-600 border-b pb-1">2</sup>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-lg border border-slate-100">
            <div><span className="font-bold text-blue-600">W</span> : オリジナルのFP16重み</div>
            <div><span className="font-bold text-teal-600">X</span> : オリジナルのクリーンな入力</div>
            <div><span className="font-bold text-blue-600">Ŵ</span> : 量子化後の重み</div>
            <div><span className="font-bold text-orange-600 text-xs px-2 py-0.5 rounded bg-orange-100 border border-orange-200">問題点</span> : 実際の推論時はクリーンな <span className="font-bold text-teal-600">X</span> ではなく、誤差を含んだ入力が来る。</div>
          </div>
        </div>
      </section>

      {/* QEP Math */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
        <div className="bg-blue-50 border-b border-blue-100 px-6 py-4 flex items-center gap-3">
          <BrainCircuit className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-bold text-slate-800">2. QEP (誤差伝播手法) の数式</h3>
        </div>
        <div className="p-6 space-y-6">
          <p className="text-slate-700">
            QEPでは、キャリブレーション用の入力として<b>「既に前の層の量子化誤差を含んだ実際の入力 (<span className="font-bold text-purple-600">X̂</span>)」</b>を使用します。
            しかし、正解データとしては<b>「オリジナルのFP16が本来出すべき出力 (<span className="font-bold text-blue-600">W</span><span className="font-bold text-teal-600">X</span>)」</b>を目標にします。
          </p>

          <div className="flex justify-center bg-slate-900 rounded-xl p-8 shadow-inner my-6 border border-slate-800">
            <div className="text-white font-serif text-2xl tracking-wider tabular-nums flex items-center gap-3">
              <span className="text-slate-400 text-lg">arg min</span>
              <span className="text-3xl text-slate-500">||</span>
              <span>
                <span className="text-blue-400">W</span>
                <span className="text-teal-400">X</span> 
                <span className="mx-3 text-slate-400">-</span> 
                <span className="text-blue-400">Ŵ</span>
                <span className="text-purple-400 font-bold border-b-2 border-purple-500">X̂</span>
              </span>
              <span className="text-3xl text-slate-500">||</span>
              <div className="flex flex-col justify-center ml-1">
                <span className="text-sm leading-none -mb-1">2</span>
                <span className="text-sm leading-none mt-1">2</span>
              </div>
            </div>
          </div>

          <div className="bg-blue-50/50 p-5 rounded-xl border border-blue-100 text-slate-700 text-sm leading-relaxed">
            <Lightbulb className="w-5 h-5 text-blue-500 mb-2 inline-block mr-2" />
            <strong className="text-blue-800">直感的な意味:</strong><br />
            「前の層がやらかしたミス（ <span className="font-bold text-purple-600">X̂</span> のズレ）」を受け取った上で、最終的な出力結果が「本来の正しい答え（ <span className="font-bold text-blue-600">W</span><span className="font-bold text-teal-600">X</span> ）」に最も近くなるように、自分の層の重み <span className="font-bold text-blue-600">Ŵ</span> の丸め方を調整（相殺）する。
          </div>
        </div>
      </section>

      {/* Concrete Example */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-emerald-50 border-b border-emerald-100 px-6 py-4 flex items-center gap-3">
          <Calculator className="w-5 h-5 text-emerald-600" />
          <h3 className="text-lg font-bold text-slate-800">3. 1次元モデルでの具体例（誤差相殺のデモ）</h3>
        </div>
        <div className="p-6">
          <p className="text-slate-600 mb-6 text-sm">
            非常にシンプルな1次元の2層モデル（関数 <span className="font-mono">y = w2 * (w1 * x)</span> ）で、QEPがどう誤差を打ち消すか計算してみます。
          </p>

          <div className="space-y-6">
            {/* Setup */}
            <div className="border border-slate-200 rounded-lg p-4">
              <h4 className="font-bold text-slate-700 mb-2 border-b pb-2">【前提条件】</h4>
              <ul className="text-sm text-slate-600 space-y-1 font-mono">
                <li>入力: x = 1.0</li>
                <li>層1のFP16重み: w1 = 1.0</li>
                <li>層2のFP16重み: w2 = 1.0</li>
                <li className="text-emerald-600 font-bold mt-2 pt-2 border-t border-slate-100">目標出力 y = 1.0 * (1.0 * 1.0) = 1.0</li>
              </ul>
            </div>

            <div className="flex items-center justify-center">
              <ArrowRight className="text-slate-300 w-6 h-6 rotate-90 sm:rotate-0" />
            </div>

            {/* Error happens */}
            <div className="border border-orange-200 bg-orange-50 rounded-lg p-4">
              <h4 className="font-bold text-orange-800 mb-2 border-b border-orange-200 pb-2">【層1での量子化誤差発生】</h4>
              <p className="text-sm text-orange-700 font-mono">
                2-bit量子化の仕様上、w1 を 1.0 にできず、<span className="font-bold bg-orange-200 px-1 rounded">ŵ1 = 0.8</span> に丸められてしまったとします。
                <br /><br />
                層1の出力（＝層2への実際の入力）: x̂2 = 0.8 * 1.0 = <span className="font-bold underline">0.8</span>
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
              {/* Standard */}
              <div className="border border-slate-200 rounded-lg p-4 relative">
                <div className="absolute top-0 right-0 bg-slate-100 text-slate-500 text-xs font-bold px-2 py-1 rounded-bl-lg rounded-tr-lg">従来手法</div>
                <h4 className="font-bold text-slate-700 mb-3 text-sm">層2のキャリブレーション</h4>
                <div className="text-sm text-slate-600 space-y-2">
                  <p>「正常な入力 <span className="font-mono">x=1.0</span> が来る」と思い込んで最適化する。</p>
                  <p className="font-mono bg-slate-50 p-2 rounded text-center">ŵ2 = 1.0</p>
                  <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded text-red-700">
                    <span className="block font-bold mb-1 text-xs uppercase tracking-wider">実際の推論出力</span>
                    <span className="font-mono text-lg">y = 1.0 * 0.8 = <span className="font-bold">0.8</span></span>
                    <span className="block text-xs mt-1">（目標の1.0から大きく乖離 ❌）</span>
                  </div>
                </div>
              </div>

              {/* QEP */}
              <div className="border-2 border-blue-400 shadow-md rounded-lg p-4 relative bg-blue-50/30">
                <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-bl-lg rounded-tr-sm">QEP (誤差伝播)</div>
                <h4 className="font-bold text-blue-900 mb-3 text-sm">層2のキャリブレーション</h4>
                <div className="text-sm text-slate-700 space-y-2">
                  <p>「誤差を含んだ入力 <span className="font-mono font-bold text-purple-600">x̂2=0.8</span>」を受け取り、目標出力 <span className="font-mono">1.0</span> に近づけるように最適化する。</p>
                  <p className="font-mono bg-blue-100 p-2 rounded text-center font-bold text-blue-800">
                    1.0 = ŵ2 * 0.8 <ArrowRight className="w-3 h-3 inline mx-1"/> ŵ2 = 1.25
                  </p>
                  <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded text-emerald-800 shadow-inner">
                    <span className="block font-bold mb-1 text-xs uppercase tracking-wider">実際の推論出力</span>
                    <span className="font-mono text-lg">y = 1.25 * 0.8 = <span className="font-bold">1.0</span></span>
                    <span className="block text-xs mt-1">（以前の誤差を見事に相殺 ✨）</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

    </div>
  );
}
