'use client'

interface PlayerSeatProps {
  player: {
    id: string
    name: string
    chips: number
    position: string
  }
  position: string
  isCurrentTurn: boolean
  isDealer: boolean
  isUser?: boolean
  isUserTurn?: boolean
  turnTimer?: number
}

export default function PlayerSeat({ 
  player, 
  position, 
  isCurrentTurn, 
  isDealer, 
  isUser = false,
  isUserTurn = false,
  turnTimer = 30
}: PlayerSeatProps) {
  const getPositionClasses = (pos: string) => {
    switch (pos) {
      case 'bottom': return 'bottom-8 left-1/2 transform -translate-x-1/2'
      case 'bottom-right': return 'bottom-12 right-12'
      case 'right': return 'top-1/2 right-8 transform -translate-y-1/2'
      case 'top-right': return 'top-12 right-12'
      case 'top': return 'top-8 left-1/2 transform -translate-x-1/2'
      case 'top-left': return 'top-12 left-12'
      case 'left': return 'top-1/2 left-8 transform -translate-y-1/2'
      case 'bottom-left': return 'bottom-12 left-12'
      default: return 'bottom-8 left-1/2 transform -translate-x-1/2'
    }
  }

  return (
    <div className={`player-seat absolute ${getPositionClasses(position)}`}>
      <div className={`text-center transition-all duration-300 ${isCurrentTurn ? 'scale-110' : 'scale-100'}`}>
        <div className={`bg-black/20 backdrop-blur-sm px-4 py-3 rounded-xl transition-all duration-300 ${
          isCurrentTurn 
            ? isUserTurn 
              ? 'ring-2 ring-emerald-500 bg-emerald-500/10' 
              : 'ring-2 ring-blue-500 bg-blue-500/10'
            : isUser 
              ? 'ring-1 ring-gray-400' 
              : ''
        }`}>
          <div className="text-sm font-bold text-white mb-1">
            {player.name}
            {isUser && <span className="text-emerald-400 ml-1">(You)</span>}
          </div>
          <div className="text-xs text-emerald-400 font-medium mb-2">${player.chips.toLocaleString()}</div>
          
          {/* Status indicators */}
          <div className="flex items-center justify-center gap-2">
            {isDealer && (
              <div className="w-2 h-2 bg-emerald-400 rounded-full" title="Dealer"></div>
            )}
            {isCurrentTurn && (
              <div className={`text-xs font-medium ${
                isUserTurn ? 'text-emerald-400' : 'text-blue-400'
              }`}>
                {isUserTurn ? `TURN (${turnTimer}s)` : 'TURN'}
              </div>
            )}
            {isUserTurn && (
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 