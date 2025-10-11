#!/usr/bin/env python3
"""
Poker Bridge - Direct integration with existing poker engines
Uses PyPokerEngine and poker-master libraries for heavy lifting
"""

import sys
import json
import os

# Add the existing libraries to Python path
sys.path.append('/Users/waleedraza/Desktop/pokeher/PyPokerEngine-master')
sys.path.append('/Users/waleedraza/Desktop/pokeher/poker-master')

from pypokerengine.engine.hand_evaluator import HandEvaluator
from pypokerengine.engine.card import Card as PyCard
from pypokerengine.engine.dealer import Dealer
from pypokerengine.api.game import setup_config, start_poker
from pypokerengine.players import BasePokerPlayer

try:
    from poker.hand import Hand
    from poker.card import Card as PokerCard
    POKER_MASTER_AVAILABLE = True
except ImportError:
    POKER_MASTER_AVAILABLE = False

class PokerBridge:
    """Bridge class that provides poker functionality to TypeScript"""
    
    def __init__(self):
        self.hand_evaluator = HandEvaluator()
    
    def evaluate_hand(self, hole_cards, community_cards):
        """
        Evaluate hand strength using PyPokerEngine's fast evaluator
        Args:
            hole_cards: [{"suit": 1, "rank": 14}, {"suit": 2, "rank": 13}]
            community_cards: [{"suit": 1, "rank": 12}, ...]
        Returns:
            {"strength": "ONEPAIR", "rank": 14, "score": 256}
        """
        try:
            # Convert to PyPokerEngine card format
            hole = [PyCard(card["suit"], card["rank"]) for card in hole_cards]
            community = [PyCard(card["suit"], card["rank"]) for card in community_cards]
            
            # Evaluate hand
            hand_info = self.hand_evaluator.gen_hand_rank_info(hole, community)
            hand_score = self.hand_evaluator.eval_hand(hole, community)
            
            return {
                "success": True,
                "hand_info": hand_info,
                "score": hand_score,
                "strength": hand_info["hand"]["strength"]
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def compare_hands(self, hand1_cards, hand2_cards, community_cards):
        """Compare two hands and return winner"""
        try:
            # Evaluate both hands
            hand1_result = self.evaluate_hand(hand1_cards, community_cards)
            hand2_result = self.evaluate_hand(hand2_cards, community_cards)
            
            if not (hand1_result["success"] and hand2_result["success"]):
                return {"success": False, "error": "Failed to evaluate hands"}
            
            score1 = hand1_result["score"]
            score2 = hand2_result["score"]
            
            if score1 > score2:
                winner = 1
            elif score2 > score1:
                winner = 2
            else:
                winner = 0  # Tie
            
            return {
                "success": True,
                "winner": winner,
                "hand1": hand1_result,
                "hand2": hand2_result
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def parse_hand_range(self, range_string):
        """Parse hand range using poker-master if available"""
        if not POKER_MASTER_AVAILABLE:
            return {"success": False, "error": "poker-master not available"}
        
        try:
            hand_range = Hand(range_string)
            combos = [str(combo) for combo in hand_range.to_combos()]
            
            return {
                "success": True,
                "range": range_string,
                "combos": combos,
                "count": len(combos)
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

class SimplePlayer(BasePokerPlayer):
    """Simple player for testing game functionality"""
    
    def declare_action(self, valid_actions, hole_card, round_state):
        # Simple strategy: call if possible, otherwise fold
        for action in valid_actions:
            if action["action"] == "call":
                return action["action"], action["amount"]
        return "fold", 0
    
    def receive_game_start_message(self, game_info):
        pass
    
    def receive_round_start_message(self, round_count, hole_card, seats):
        pass
    
    def receive_street_start_message(self, street, round_state):
        pass
    
    def receive_game_update_message(self, action, round_state):
        pass
    
    def receive_round_result_message(self, winners, hand_info, round_state):
        pass

def run_test_game():
    """Run a test game using PyPokerEngine"""
    try:
        config = setup_config(max_round=3, initial_stack=100, small_blind_amount=5)
        config.register_player(name="p1", algorithm=SimplePlayer())
        config.register_player(name="p2", algorithm=SimplePlayer())
        
        game_result = start_poker(config, verbose=0)
        
        return {
            "success": True,
            "result": game_result
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

def main():
    """Main function to handle bridge requests"""
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No command provided"}))
        return
    
    command = sys.argv[1]
    bridge = PokerBridge()
    
    if command == "evaluate_hand":
        # Example: python poker_bridge.py evaluate_hand '{"hole": [{"suit": 1, "rank": 14}, {"suit": 2, "rank": 14}], "community": [{"suit": 1, "rank": 13}, {"suit": 2, "rank": 12}, {"suit": 3, "rank": 11}, {"suit": 4, "rank": 10}, {"suit": 1, "rank": 9}]}'
        if len(sys.argv) < 3:
            print(json.dumps({"error": "No data provided"}))
            return
        
        data = json.loads(sys.argv[2])
        result = bridge.evaluate_hand(data["hole"], data["community"])
        print(json.dumps(result))
    
    elif command == "compare_hands":
        if len(sys.argv) < 3:
            print(json.dumps({"error": "No data provided"}))
            return
        
        data = json.loads(sys.argv[2])
        result = bridge.compare_hands(data["hand1"], data["hand2"], data["community"])
        print(json.dumps(result))
    
    elif command == "parse_range":
        if len(sys.argv) < 3:
            print(json.dumps({"error": "No range provided"}))
            return
        
        range_string = sys.argv[2]
        result = bridge.parse_hand_range(range_string)
        print(json.dumps(result))
    
    elif command == "test_game":
        result = run_test_game()
        print(json.dumps(result))
    
    else:
        print(json.dumps({"error": f"Unknown command: {command}"}))

if __name__ == "__main__":
    main()