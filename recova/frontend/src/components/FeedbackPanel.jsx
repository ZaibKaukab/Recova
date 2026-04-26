export default function FeedbackPanel({ feedback, isLoading }) {
  return (
    <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
      <h2 className="text-sm font-semibold text-teal-400 uppercase tracking-wider mb-3">
        Recova Feedback
      </h2>

      {isLoading ? (
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <span className="animate-pulse">●</span>
          <span className="animate-pulse delay-75">●</span>
          <span className="animate-pulse delay-150">●</span>
          <span className="ml-1">Getting feedback...</span>
        </div>
      ) : feedback ? (
        <p className="text-gray-100 text-sm leading-relaxed">{feedback}</p>
      ) : (
        <p className="text-gray-500 text-sm italic">
          Complete a rep to receive feedback.
        </p>
      )}
    </div>
  )
}
