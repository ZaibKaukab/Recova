export default function SessionSummary({ summary, totalReps, avgFormScore, onRestart }) {
  return (
    <div className="max-w-xl mx-auto bg-gray-900 rounded-xl p-6 border border-gray-800">
      <h2 className="text-lg font-bold text-teal-400 mb-4">Session Complete</h2>

      <div className="flex gap-6 mb-5">
        <div className="text-center">
          <div className="text-3xl font-bold text-white">{totalReps}</div>
          <div className="text-xs text-gray-400 mt-1">Total Reps</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-white">{avgFormScore}%</div>
          <div className="text-xs text-gray-400 mt-1">Avg Form Score</div>
        </div>
      </div>

      {summary && (
        <div className="bg-gray-800 rounded-lg p-4 mb-5">
          <p className="text-gray-100 text-sm leading-relaxed">{summary}</p>
        </div>
      )}

      <button
        onClick={onRestart}
        className="w-full py-3 bg-teal-600 hover:bg-teal-500 rounded-lg font-semibold transition-colors"
      >
        Start New Session
      </button>
    </div>
  )
}
