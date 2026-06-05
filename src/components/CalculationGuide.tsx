import { BookOpen, Cpu, Database, Server, Settings, Zap } from "lucide-react";

export function CalculationGuide() {
  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-16">
      
      <div className="text-center space-y-4 mb-12">
        <h2 className="text-3xl font-bold text-slate-800">VRAM計算のステップバイステップガイド</h2>
        <p className="text-slate-600">
          なぜ大規模言語モデル（LLM）の量子化に大量のメモリが必要なのか、その計算の仕組みを順番に解説します。
        </p>
      </div>

      {/* Step 1 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-blue-50 border-b border-blue-100 px-6 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">1</div>
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-600" /> モデル自体の重み (Weights)
          </h3>
        </div>
        <div className="p-6 text-slate-700 space-y-4">
          <p>
            モデルを読み込む際、最初は元の精度（通常は 16-bit 浮動小数点 = <b>FP16</b> または <b>BF16</b>）でメモリに乗ります。
            1つのパラメータにつき <b>2バイト (16 bit / 8 = 2 byte)</b> を消費します。
          </p>
          <div className="bg-slate-800 rounded-lg p-4 font-mono text-sm text-slate-300">
            <span className="text-emerald-400">計算式:</span><br />
            モデルサイズ = パラメータ数 × 2 bytes
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded p-4 text-sm mt-4">
            <strong className="text-slate-800">例: Llama 3 8B の場合</strong><br />
            8,000,000,000 (8B) × 2 = 16,000,000,000 byte = <strong className="text-blue-600 font-mono">約 16 GB</strong> のVRAMがモデルだけで必要です。
          </div>
        </div>
      </div>

      {/* Step 2 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-teal-50 border-b border-teal-100 px-6 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-sm">2</div>
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Zap className="w-5 h-5 text-teal-600" /> アクティベーション (計算途中データ)
          </h3>
        </div>
        <div className="p-6 text-slate-700 space-y-4">
          <p>
            量子化を正確に行うには、「実際のテキストを入力した時に、各ニューロンがどう反応するか」を記録する必要があります。
            これが<b>Activations（アクティベーション）</b>です。
          </p>
          <div className="bg-slate-800 rounded-lg p-4 font-mono text-sm text-slate-300">
            <span className="text-emerald-400">1トークンあたりの容量計算式:</span><br />
            隠れ層の次元数 (Hidden Size) × 2 bytes<br /><br />
            <span className="text-emerald-400">全体の容量（キャリブレーション時）:</span><br />
            トークン容量 × シーケンス長 (Seq Length) × バッチサイズ (Batch Size)
          </div>
          <ul className="list-disc pl-5 space-y-2 mt-4 text-sm">
            <li>LLMは数十の「層 (Layers)」を持っています。通常の実装では、全層のアクティベーションをメモリに保持しようとするため、ここでVRAMが破綻します（OOM: Out of Memory）。</li>
          </ul>
        </div>
      </div>

      {/* Step 3 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-purple-50 border-b border-purple-100 px-6 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-sm">3</div>
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Server className="w-5 h-5 text-purple-600" /> ヘッセ行列 (Hessian Matrix: X^T X)
          </h3>
        </div>
        <div className="p-6 text-slate-700 space-y-4">
          <p>
            GPTQなどの高度な量子化アルゴリズムでは、「データの相関性」を計算して誤差を補正します。
            このために <b>Hessian (ヘッセ行列)</b> という巨大な2次元配列を作成します。
            計算の安定性のために高精度な <b>FP64（64-bit = 8バイト）</b> で構築されるのが一般的です。
          </p>
          <div className="bg-slate-800 rounded-lg p-4 font-mono text-sm text-slate-300">
            <span className="text-emerald-400">計算式:</span><br />
            Hessianの容量 = Hidden Size × Hidden Size × 8 bytes
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded p-4 text-sm mt-4">
            <strong className="text-slate-800">例: Llama 2 13B (Hidden Size: 5120) の場合</strong><br />
            5120 × 5120 × 8 = 209,715,200 bytes = <strong className="text-purple-600 font-mono">約 209 MB (1層あたり)</strong><br />
            これを全層(40層)同時に計算すると、Hessianだけで約 8.3 GB 消費します。
          </div>
        </div>
      </div>

      {/* Step 4 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-orange-50 border-b border-orange-100 px-6 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-orange-600 text-white flex items-center justify-center font-bold text-sm">4</div>
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-orange-600" /> 解決策: チャンク化 (Chunked Quantization)
          </h3>
        </div>
        <div className="p-6 text-slate-700 space-y-4">
          <p>
            上記の Step 2 と Step 3 のメモリ爆発を防ぐため、OneComp等のライブラリは<b>チャンク処理 (Chunked Processing)</b> を導入しています。
          </p>
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li>全層の計算を一度に行うのではなく、<b>「1つの層（または数層のグループ）」</b>に限定して処理を行います。</li>
            <li>その層の量子化が終わり次第、メモリ（アクティベーションとHessian行列）を解放 (GC.collect / empty_cache) してから次の層に進みます。</li>
            <li>これにより、ピークVRAMを <b>「モデルの重み + わずか1層分の計算用メモリ」</b> に抑え込み、無料枠のGPU（Tesla T4 15GB等）でも量子化が可能になります。</li>
          </ul>
        </div>
      </div>
      
    </div>
  );
}
