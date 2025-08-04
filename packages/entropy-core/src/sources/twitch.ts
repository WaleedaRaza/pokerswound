import { EntropySource, EntropySample } from '../types'

export class TwitchEntropySource implements EntropySource {
  id: string
  name: string
  type: 'twitch'
  reliability: number
  latency: number
  entropyPerSecond: number
  private channel: string
  private isActive: boolean = false
  private lastMessageTime: number = 0

  constructor(channel: string, config?: Partial<EntropySource>) {
    this.channel = channel
    this.id = `twitch:${channel}`
    this.name = `Twitch Chat - ${channel}`
    this.type = 'twitch'
    this.reliability = config?.reliability ?? 0.8
    this.latency = config?.latency ?? 1000
    this.entropyPerSecond = config?.entropyPerSecond ?? 50
  }

  /**
   * Start collecting entropy from Twitch chat
   */
  async start(): Promise<void> {
    if (this.isActive) return

    this.isActive = true
    console.log(`Starting Twitch entropy collection from #${this.channel}`)
    
    // In a real implementation, this would connect to Twitch IRC
    // For now, we'll simulate chat messages
    this.simulateChatMessages()
  }

  /**
   * Stop collecting entropy
   */
  stop(): void {
    this.isActive = false
    console.log(`Stopped Twitch entropy collection from #${this.channel}`)
  }

  /**
   * Generate entropy sample from chat message
   */
  private generateSample(message: string, username: string): EntropySample {
    const timestamp = Date.now()
    const data = `${username}:${message}:${timestamp}`
    
    // Estimate entropy based on message length and character diversity
    const uniqueChars = new Set(message).size
    const entropyBits = Math.min(uniqueChars * message.length * 0.1, 32)
    
    // Quality based on message timing and content
    const timeSinceLastMessage = timestamp - this.lastMessageTime
    const quality = Math.min(timeSinceLastMessage / 1000, 1) * 0.8 + 0.2
    
    this.lastMessageTime = timestamp

    return {
      sourceId: this.id,
      timestamp,
      data,
      entropyBits: Math.floor(entropyBits),
      quality
    }
  }

  /**
   * Simulate chat messages for development
   */
  private simulateChatMessages(): void {
    if (!this.isActive) return

    const messages = [
      "Nice play!",
      "GG",
      "What a save!",
      "LUL",
      "PogChamp",
      "Kappa",
      "MonkaS",
      "FeelsGoodMan",
      "PepeHands",
      "BibleThump"
    ]

    const usernames = [
      "Player123",
      "GamerGirl",
      "PokerPro",
      "CardMaster",
      "DealerDan",
      "AceHigh",
      "RoyalFlush",
      "BluffKing",
      "ChipStacker",
      "FoldMaster"
    ]

    const interval = setInterval(() => {
      if (!this.isActive) {
        clearInterval(interval)
        return
      }

      const message = messages[Math.floor(Math.random() * messages.length)]
      const username = usernames[Math.floor(Math.random() * usernames.length)]
      
      // Add some randomness to timing
      const delay = Math.random() * 2000 + 500
      setTimeout(() => {
        if (this.isActive) {
          const sample = this.generateSample(message, username)
          // In a real implementation, this would emit the sample
          console.log(`Twitch entropy: ${sample.entropyBits} bits from "${message}"`)
        }
      }, delay)
    }, 1000)
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      isActive: this.isActive,
      channel: this.channel,
      lastMessageTime: this.lastMessageTime,
      uptime: this.isActive ? Date.now() - this.lastMessageTime : 0
    }
  }
} 