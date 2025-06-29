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
}

export default function PlayerSeat({ player, position, isCurrentTurn, isDealer }: PlayerSeatProps) {
  const getPositionClasses = (pos: string) => {
    switch (pos) {
      case 'bottom': return 'bottom-4 left-1/2'
      case 'bottom-right': return 'bottom-8 right-8'
      case 'right': return 'top-1/2 right-4'
      case 'top-right': return 'top-8 right-8'
      case 'top': return 'top-4 left-1/2'
      case 'top-left': return 'top-8 left-8'
      case 'left': return 'top-1/2 left-4'
      case 'bottom-left': return 'bottom-8 left-8'
      default: return 'bottom-4 left-1/2'
    }
  }

  return (
    <div className={`player-seat ${getPositionClasses(position)}`}>
      <div className={`text-center ${isCurrentTurn ? 'ring-2 ring-poker-gold' : ''}`}>
        <div className="bg-black bg-opacity-75 px-3 py-2 rounded-lg">
          <div className="text-sm font-bold">{player.name}</div>
          <div className="text-xs text-poker-gold">${player.chips}</div>
          {isDealer && (
            <div className="text-xs text-poker-gold mt-1">DEALER</div>
          )}
        </div>
      </div>
    </div>
  )
} 