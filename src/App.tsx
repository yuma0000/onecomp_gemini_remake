import { QEPVisualizer } from "./components/QEPVisualizer";
import { Cpu, BrainCircuit, ArrowDownToDot, Layers } from "lucide-react";

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-24">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 py-6 px-6 sm:px-12 flex items-center gap-4 shadow-sm sticky top-0 z-50">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-inner">
          <BrainCircuit className="text-white w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold font-mono tracking-tight text-slate-900">OneCompression QEP Visualizer</h1>
          <p className="text-xs font-medium text-slate-500">2-bit Quantization Error Propagation Engine</p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 lg:px-8 mt-12 space-y-16">
        
        {/* Intro */}
        <section className="text-center max-w-3xl mx-auto space-y-6">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 leading-tight">
            なぜ極低ビット量子化（2-bitなど）は<br className="hidden sm:block" />モデルを破壊してしまうのか？
          </h2>
          <p className="text-lg text-slate-600 leading-relaxed">
            LLMのパラメータを2-bitまで圧縮すると、計算時に不可避の「量子化誤差」が発生します。
            従来の手法（標準のGPTQなど）では、この誤差が層(Layer)を通過するごとに雪だるま式に蓄積し、最終的に出力が完全に壊れてしまいます（崩壊現象）。
          </p>
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 text-left shadow-sm">
            <h3 className="flex items-center gap-2 font-bold text-blue-900 mb-2">
              <Cpu className="w-5 h-5 text-blue-600" />
              QEP (Quantization Error Propagation) の解決策
            </h3>
            <p className="text-sm text-blue-800/80 leading-relaxed">
              QEPは**「誤差を無かったことにするのではなく、誤差を前提として次の層を最適化する」**手法です。
              前の層で発生した量子化のズレを実際に計算し、その「ズレを含んだ現実の入力」を使って次の層をキャリブレーションすることで、モデル全体で誤差を相殺・吸収します。これによって2-bitのような極端な圧縮でも性能を維持できます。
            </p>
          </div>
        </section>

        {/* Interactive Visualization Grid */}
        <section className="space-y-8">
          <div className="flex items-center justify-center gap-3">
            <Layers className="w-6 h-6 text-slate-400" />
            <h2 className="text-2xl font-bold text-slate-800">動作シミュレーション</h2>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="flex flex-col items-center">
              <QEPVisualizer mode="standard" />
              <div className="mt-6 px-6 max-w-md">
                <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs">❌</span>
                  従来手法の場合
                </h4>
                <p className="text-sm text-slate-600 leading-relaxed">
                  各層は「FP16の完璧な入力」が来ると信じて最適化されます。しかし実際の推論時には、前の層で発生した誤差を含んだデータが入力されるため、想定外の入力に対して出力が大きく崩れます。
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center">
              <QEPVisualizer mode="qep" />
              <div className="mt-6 px-6 max-w-md">
                <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs">✨</span>
                  QEP適用時の場合
                </h4>
                <p className="text-sm text-slate-600 leading-relaxed">
                  各層は「既に量子化誤差が含まれた入力」を受け取った上で最適化されるため、誤差に適応して自己修正を行うことができます。結果として末端出力の品質が劇的に保たれます。
                </p>
              </div>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
