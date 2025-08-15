// app/components/LoadingScreen.tsx

interface LoadingScreenProps {
  message?: string;
  showProgress?: boolean;
}

export default function LoadingScreen({ 
  message = "AI is working its magic...", 
  showProgress = false 
}: LoadingScreenProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[9999]">
      <div className="bg-white dark:bg-zinc-900 rounded-xl p-8 max-w-md mx-4 text-center shadow-2xl border-2 border-blue-200 dark:border-blue-800">
        {/* Animated spinner */}
        <div className="mb-6">
          <div className="inline-block animate-spin rounded-full h-20 w-20 border-4 border-blue-600 border-t-transparent"></div>
        </div>
        
        {/* Loading message */}
        <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
          {message}
        </h3>
        
        {/* Subtitle */}
        <p className="text-gray-600 dark:text-gray-300 text-sm">
          This may take a few moments...
        </p>
        
        {/* Progress indicator */}
        {showProgress && (
          <div className="mt-6">
            <div className="w-full bg-gray-200 dark:bg-zinc-700 rounded-full h-3">
              <div className="bg-blue-600 h-3 rounded-full animate-pulse" style={{ width: '60%' }}></div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Processing your request...</p>
          </div>
        )}
        
        {/* Fun travel-themed loading tips */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-xs text-blue-700 dark:text-blue-300">
            💡 <strong>Travel Tip:</strong> While you wait, think about what you'd like to experience most on your trip!
          </p>
        </div>
        
        {/* Additional loading indicator */}
        <div className="mt-4 text-xs text-gray-500">
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}
