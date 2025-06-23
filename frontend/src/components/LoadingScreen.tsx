interface LoadingScreenProps {
  message?: string;
}

export default function LoadingScreen({ message = "Laden" }: LoadingScreenProps) {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #e8eef2 0%, #f5f7fa 100%)' }}>
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full blur-3xl opacity-20 animate-pulse" style={{ background: 'linear-gradient(135deg, #d5896f, #e8eef2)' }}></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full blur-3xl opacity-15 animate-pulse" style={{ background: 'linear-gradient(45deg, #d5896f, #67697c)', animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60 rounded-full blur-2xl opacity-10 animate-pulse" style={{ background: 'linear-gradient(135deg, #d5896f, #e8eef2)', animationDelay: '0.5s' }}></div>
      </div>

      {/* Main loading content */}
      <div className="relative z-10 flex flex-col items-center space-y-8">
        {/* Logo container with enhanced animation */}
        <div className="relative">
          <div className="absolute inset-0 rounded-2xl blur-xl opacity-30 animate-pulse" style={{ background: 'linear-gradient(135deg, #d5896f, #d5896f90)' }}></div>
          <div className="relative h-24 w-24 rounded-2xl flex items-center justify-center shadow-2xl animate-bounce" style={{
            background: 'linear-gradient(135deg, #d5896f, #d5896f90)',
            boxShadow: '0 25px 50px rgba(213, 137, 111, 0.25)',
            animationDuration: '2s'
          }}>
            <svg className="h-12 w-12 text-white animate-pulse" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
            </svg>
          </div>
        </div>

        {/* Loading spinner with enhanced design */}
        <div className="relative">
          <div className="w-16 h-16 border-4 border-transparent rounded-full animate-spin" style={{
            borderTop: '4px solid #d5896f',
            borderRight: '4px solid #d5896f60',
            borderBottom: '4px solid #d5896f30'
          }}></div>
          <div className="absolute inset-0 w-16 h-16 border-4 border-transparent rounded-full animate-spin" style={{
            borderLeft: '4px solid #d5896f20',
            animationDirection: 'reverse',
            animationDuration: '1.5s'
          }}></div>
        </div>

        {/* Loading text with typing animation */}
        <div className="text-center space-y-3">
          <h2 className="text-2xl font-bold animate-pulse" style={{
            background: 'linear-gradient(135deg, #120309, #67697c)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Jill Dashboard
          </h2>
          <div className="flex items-center justify-center space-x-2">
            <p className="font-medium" style={{ color: '#67697c' }}>{message}</p>
            <div className="flex space-x-1">
              <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#d5896f' }}></div>
              <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#d5896f', animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#d5896f', animationDelay: '0.2s' }}></div>
            </div>
          </div>
        </div>

        {/* Subtle progress indication */}
        <div className="w-64 h-1 bg-gray-200/50 rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{
            background: 'linear-gradient(90deg, #d5896f, #d5896f90, #d5896f)',
            animation: 'progress 2s ease-in-out infinite'
          }}></div>
        </div>
      </div>

      <style jsx>{`
        @keyframes progress {
          0% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
}