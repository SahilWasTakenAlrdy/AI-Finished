import pygame
import sys
import math
import random
from enum import Enum

# Initialize Pygame
pygame.init()

# Constants
SCREEN_WIDTH = 800
SCREEN_HEIGHT = 800
BOARD_SIZE = 640
SQUARE_SIZE = BOARD_SIZE // 8
MARGIN_X = (SCREEN_WIDTH - BOARD_SIZE) // 2
MARGIN_Y = (SCREEN_HEIGHT - BOARD_SIZE) // 2

# Colors
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
LIGHT_SQUARE = (240, 217, 181)
DARK_SQUARE = (181, 136, 99)
HIGHLIGHT_COLOR = (106, 176, 76, 180)
MOVE_HINT_COLOR = (124, 174, 221, 150)
TEXT_COLOR = (50, 50, 50)
BUTTON_COLOR = (70, 130, 180)
BUTTON_HOVER_COLOR = (100, 149, 237)
PAUSE_BG = (0, 0, 0, 180)

class PieceType(Enum):
    PAWN = "pawn"
    ROOK = "rook"
    KNIGHT = "knight"
    BISHOP = "bishop"
    QUEEN = "queen"
    KING = "king"

class PieceColor(Enum):
    WHITE = "white"
    BLACK = "black"

class GameState(Enum):
    MENU = "menu"
    GAME_SETUP = "game_setup"
    PLAYING = "playing"
    PAUSED = "paused"
    GAME_OVER = "game_over"

class Piece:
    def __init__(self, piece_type, color, row, col):
        self.type = piece_type
        self.color = color
        self.row = row
        self.col = col
        self.has_moved = False  # For castling and pawn double move
        
    def get_symbol(self):
        symbols = {
            (PieceType.KING, PieceColor.WHITE): "♔",
            (PieceType.QUEEN, PieceColor.WHITE): "♕",
            (PieceType.ROOK, PieceColor.WHITE): "♖",
            (PieceType.BISHOP, PieceColor.WHITE): "♗",
            (PieceType.KNIGHT, PieceColor.WHITE): "♘",
            (PieceType.PAWN, PieceColor.WHITE): "♙",
            (PieceType.KING, PieceColor.BLACK): "♚",
            (PieceType.QUEEN, PieceColor.BLACK): "♛",
            (PieceType.ROOK, PieceColor.BLACK): "♜",
            (PieceType.BISHOP, PieceColor.BLACK): "♝",
            (PieceType.KNIGHT, PieceColor.BLACK): "♞",
            (PieceType.PAWN, PieceColor.BLACK): "♟",
        }
        return symbols.get((self.type, self.color), "?")

class ChessGame:
    def __init__(self):
        self.screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
        pygame.display.set_caption("Chess Game")
        self.clock = pygame.time.Clock()
        
        # Fonts
        self.title_font = pygame.font.SysFont("Arial", 48, bold=True)
        self.button_font = pygame.font.SysFont("Arial", 32)
        self.small_font = pygame.font.SysFont("Arial", 24)
        
        # Game state
        self.game_state = GameState.MENU
        self.selected_difficulty = 1  # 1-3 for easy, medium, hard
        self.player_color = PieceColor.WHITE
        self.board = self.create_initial_board()
        self.selected_piece = None
        self.valid_moves = []
        self.turn = PieceColor.WHITE
        self.game_over = False
        self.winner = None
        
        # Castling tracking
        self.white_king_moved = False
        self.black_king_moved = False
        self.white_rook_a_moved = False
        self.white_rook_h_moved = False
        self.black_rook_a_moved = False
        self.black_rook_h_moved = False
        
        # En passant tracking
        self.en_passant_target = None
        
        # Move history for special moves
        self.move_history = []

    def create_initial_board(self):
        board = [[None for _ in range(8)] for _ in range(8)]
        
        # Place pawns
        for col in range(8):
            board[1][col] = Piece(PieceType.PAWN, PieceColor.BLACK, 1, col)
            board[6][col] = Piece(PieceType.PAWN, PieceColor.WHITE, 6, col)
        
        # Place other pieces
        back_row = [PieceType.ROOK, PieceType.KNIGHT, PieceType.BISHOP, PieceType.QUEEN, 
                   PieceType.KING, PieceType.BISHOP, PieceType.KNIGHT, PieceType.ROOK]
        
        for col, piece_type in enumerate(back_row):
            board[0][col] = Piece(PieceType(piece_type), PieceColor.BLACK, 0, col)
            board[7][col] = Piece(PieceType(piece_type), PieceColor.WHITE, 7, col)
            
        return board

    def draw_main_menu(self):
        self.screen.fill(WHITE)
        
        # Draw title
        title = self.title_font.render("Chess Game", True, TEXT_COLOR)
        title_rect = title.get_rect(center=(SCREEN_WIDTH//2, SCREEN_HEIGHT//4))
        self.screen.blit(title, title_rect)
        
        # Draw play button
        button_width = 200
        button_height = 60
        button_x = SCREEN_WIDTH // 2 - button_width // 2
        button_y = SCREEN_HEIGHT // 2
        
        mouse_pos = pygame.mouse.get_pos()
        button_hover = (button_x <= mouse_pos[0] <= button_x + button_width and 
                       button_y <= mouse_pos[1] <= button_y + button_height)
        
        button_color = BUTTON_HOVER_COLOR if button_hover else BUTTON_COLOR
        pygame.draw.rect(self.screen, button_color, (button_x, button_y, button_width, button_height), border_radius=10)
        
        play_text = self.button_font.render("Play", True, WHITE)
        play_rect = play_text.get_rect(center=(SCREEN_WIDTH//2, button_y + button_height//2))
        self.screen.blit(play_text, play_rect)
        
        return {"play_button": pygame.Rect(button_x, button_y, button_width, button_height)}

    def draw_game_setup(self):
        self.screen.fill(WHITE)
        
        # Title
        title = self.title_font.render("Game Setup", True, TEXT_COLOR)
        title_rect = title.get_rect(center=(SCREEN_WIDTH//2, SCREEN_HEIGHT//6))
        self.screen.blit(title, title_rect)
        
        buttons = {}
        
        # Difficulty selection
        diff_title = self.button_font.render("Difficulty:", True, TEXT_COLOR)
        self.screen.blit(diff_title, (SCREEN_WIDTH//2 - diff_title.get_width()//2, SCREEN_HEIGHT//4))
        
        difficulties = ["Easy", "Medium", "Hard"]
        for i, diff in enumerate(difficulties):
            button_width = 150
            button_height = 50
            button_x = SCREEN_WIDTH//2 - button_width//2
            button_y = SCREEN_HEIGHT//4 + 60 + i * 60
            
            mouse_pos = pygame.mouse.get_pos()
            button_hover = (button_x <= mouse_pos[0] <= button_x + button_width and 
                           button_y <= mouse_pos[1] <= button_y + button_height)
            
            button_color = BUTTON_HOVER_COLOR if button_hover else BUTTON_COLOR
            if self.selected_difficulty == i + 1:
                button_color = (34, 139, 34)  # Green for selected
            
            pygame.draw.rect(self.screen, button_color, (button_x, button_y, button_width, button_height), border_radius=8)
            
            diff_text = self.small_font.render(diff, True, WHITE)
            diff_rect = diff_text.get_rect(center=(SCREEN_WIDTH//2, button_y + button_height//2))
            self.screen.blit(diff_text, diff_rect)
            
            buttons[f"diff_{i+1}"] = pygame.Rect(button_x, button_y, button_width, button_height)
        
        # Color selection
        color_title = self.button_font.render("Choose Color:", True, TEXT_COLOR)
        self.screen.blit(color_title, (SCREEN_WIDTH//2 - color_title.get_width()//2, SCREEN_HEIGHT//2 + 40))
        
        colors = [("White", PieceColor.WHITE), ("Black", PieceColor.BLACK)]
        for i, (color_name, color_enum) in enumerate(colors):
            button_width = 120
            button_height = 50
            button_x = SCREEN_WIDTH//2 - button_width - 20 if i == 0 else SCREEN_WIDTH//2 + 20
            button_y = SCREEN_HEIGHT//2 + 100
            
            mouse_pos = pygame.mouse.get_pos()
            button_hover = (button_x <= mouse_pos[0] <= button_x + button_width and 
                           button_y <= mouse_pos[1] <= button_y + button_height)
            
            button_color = BUTTON_HOVER_COLOR if button_hover else BUTTON_COLOR
            if self.player_color == color_enum:
                button_color = (34, 139, 34)  # Green for selected
            
            pygame.draw.rect(self.screen, button_color, (button_x, button_y, button_width, button_height), border_radius=8)
            
            color_text = self.small_font.render(color_name, True, WHITE)
            color_rect = color_text.get_rect(center=(button_x + button_width//2, button_y + button_height//2))
            self.screen.blit(color_text, color_rect)
            
            buttons[f"color_{color_name.lower()}"] = pygame.Rect(button_x, button_y, button_width, button_height)
        
        # Start button
        start_button_width = 150
        start_button_height = 60
        start_button_x = SCREEN_WIDTH // 2 - start_button_width // 2
        start_button_y = SCREEN_HEIGHT - 100
        
        mouse_pos = pygame.mouse.get_pos()
        button_hover = (start_button_x <= mouse_pos[0] <= start_button_x + start_button_width and 
                       start_button_y <= mouse_pos[1] <= start_button_y + start_button_height)
        
        button_color = BUTTON_HOVER_COLOR if button_hover else BUTTON_COLOR
        pygame.draw.rect(self.screen, button_color, (start_button_x, start_button_y, start_button_width, start_button_height), border_radius=10)
        
        start_text = self.button_font.render("Start", True, WHITE)
        start_rect = start_text.get_rect(center=(SCREEN_WIDTH//2, start_button_y + start_button_height//2))
        self.screen.blit(start_text, start_rect)
        
        buttons["start"] = pygame.Rect(start_button_x, start_button_y, start_button_width, start_button_height)
        
        return buttons

    def draw_board(self):
        # Draw board squares
        for row in range(8):
            for col in range(8):
                x = MARGIN_X + col * SQUARE_SIZE
                y = MARGIN_Y + row * SQUARE_SIZE
                
                # Alternate square colors
                if (row + col) % 2 == 0:
                    color = LIGHT_SQUARE
                else:
                    color = DARK_SQUARE
                
                pygame.draw.rect(self.screen, color, (x, y, SQUARE_SIZE, SQUARE_SIZE))
                
                # Highlight selected piece
                if self.selected_piece and self.selected_piece.row == row and self.selected_piece.col == col:
                    s = pygame.Surface((SQUARE_SIZE, SQUARE_SIZE), pygame.SRCALPHA)
                    s.fill(HIGHLIGHT_COLOR)
                    self.screen.blit(s, (x, y))
                
                # Highlight valid moves
                for move in self.valid_moves:
                    if move[0] == row and move[1] == col:
                        s = pygame.Surface((SQUARE_SIZE, SQUARE_SIZE), pygame.SRCALPHA)
                        s.fill(MOVE_HINT_COLOR)
                        self.screen.blit(s, (x, y))
                        
                        # Draw small circle for non-capture moves
                        if not self.board[row][col]:
                            center_x = x + SQUARE_SIZE // 2
                            center_y = y + SQUARE_SIZE // 2
                            radius = SQUARE_SIZE // 6
                            pygame.draw.circle(self.screen, MOVE_HINT_COLOR[:3], (center_x, center_y), radius, 3)

    def draw_pieces(self):
        for row in range(8):
            for col in range(8):
                piece = self.board[row][col]
                if piece:
                    font_size = int(SQUARE_SIZE * 0.8)
                    piece_font = pygame.font.SysFont("Arial", font_size)
                    
                    # Adjust position slightly for better visual alignment
                    text = piece_font.render(piece.get_symbol(), True, 
                                           BLACK if piece.color == PieceColor.WHITE else WHITE)
                    
                    text_rect = text.get_rect(center=(
                        MARGIN_X + col * SQUARE_SIZE + SQUARE_SIZE // 2,
                        MARGIN_Y + row * SQUARE_SIZE + SQUARE_SIZE // 2
                    ))
                    
                    self.screen.blit(text, text_rect)

    def draw_game_ui(self):
        # Draw turn indicator
        turn_text = f"{'White' if self.turn == PieceColor.WHITE else 'Black'}'s Turn"
        turn_surface = self.small_font.render(turn_text, True, TEXT_COLOR)
        self.screen.blit(turn_surface, (20, 20))
        
        # Draw pause button
        pause_button_width = 100
        pause_button_height = 40
        pause_button_x = SCREEN_WIDTH - pause_button_width - 20
        pause_button_y = 20
        
        mouse_pos = pygame.mouse.get_pos()
        button_hover = (pause_button_x <= mouse_pos[0] <= pause_button_x + pause_button_width and 
                       pause_button_y <= mouse_pos[1] <= pause_button_y + pause_button_height)
        
        button_color = BUTTON_HOVER_COLOR if button_hover else BUTTON_COLOR
        pygame.draw.rect(self.screen, button_color, (pause_button_x, pause_button_y, pause_button_width, pause_button_height), border_radius=5)
        
        pause_text = self.small_font.render("Pause", True, WHITE)
        pause_rect = pause_text.get_rect(center=(pause_button_x + pause_button_width//2, pause_button_y + pause_button_height//2))
        self.screen.blit(pause_text, pause_rect)
        
        return pygame.Rect(pause_button_x, pause_button_y, pause_button_width, pause_button_height)

    def draw_pause_menu(self):
        # Semi-transparent overlay
        overlay = pygame.Surface((SCREEN_WIDTH, SCREEN_HEIGHT), pygame.SRCALPHA)
        overlay.fill(PAUSE_BG)
        self.screen.blit(overlay, (0, 0))
        
        # Menu box
        box_width = 400
        box_height = 300
        box_x = SCREEN_WIDTH // 2 - box_width // 2
        box_y = SCREEN_HEIGHT // 2 - box_height // 2
        
        pygame.draw.rect(self.screen, WHITE, (box_x, box_y, box_width, box_height), border_radius=15)
        pygame.draw.rect(self.screen, BUTTON_COLOR, (box_x, box_y, box_width, box_height), 3, border_radius=15)
        
        # Title
        title = self.title_font.render("Paused", True, TEXT_COLOR)
        title_rect = title.get_rect(center=(SCREEN_WIDTH//2, box_y + 60))
        self.screen.blit(title, title_rect)
        
        buttons = {}
        
        # Resume button
        button_width = 200
        button_height = 50
        resume_button_y = box_y + 120
        
        mouse_pos = pygame.mouse.get_pos()
        button_hover = (box_x + (box_width - button_width)//2 <= mouse_pos[0] <= box_x + (box_width - button_width)//2 + button_width and 
                       resume_button_y <= mouse_pos[1] <= resume_button_y + button_height)
        
        button_color = BUTTON_HOVER_COLOR if button_hover else BUTTON_COLOR
        pygame.draw.rect(self.screen, button_color, 
                        (box_x + (box_width - button_width)//2, resume_button_y, button_width, button_height), border_radius=8)
        
        resume_text = self.button_font.render("Resume", True, WHITE)
        resume_rect = resume_text.get_rect(center=(SCREEN_WIDTH//2, resume_button_y + button_height//2))
        self.screen.blit(resume_text, resume_rect)
        
        buttons["resume"] = pygame.Rect(box_x + (box_width - button_width)//2, resume_button_y, button_width, button_height)
        
        # Quit button
        quit_button_y = box_y + 200
        
        button_hover = (box_x + (box_width - button_width)//2 <= mouse_pos[0] <= box_x + (box_width - button_width)//2 + button_width and 
                       quit_button_y <= mouse_pos[1] <= quit_button_y + button_height)
        
        button_color = BUTTON_HOVER_COLOR if button_hover else BUTTON_COLOR
        pygame.draw.rect(self.screen, button_color, 
                        (box_x + (box_width - button_width)//2, quit_button_y, button_width, button_height), border_radius=8)
        
        quit_text = self.button_font.render("Quit", True, WHITE)
        quit_rect = quit_text.get_rect(center=(SCREEN_WIDTH//2, quit_button_y + button_height//2))
        self.screen.blit(quit_text, quit_rect)
        
        buttons["quit"] = pygame.Rect(box_x + (box_width - button_width)//2, quit_button_y, button_width, button_height)
        
        return buttons

    def get_square_from_mouse(self, pos):
        x, y = pos
        if MARGIN_X <= x < MARGIN_X + BOARD_SIZE and MARGIN_Y <= y < MARGIN_Y + BOARD_SIZE:
            col = (x - MARGIN_X) // SQUARE_SIZE
            row = (y - MARGIN_Y) // SQUARE_SIZE
            if 0 <= row < 8 and 0 <= col < 8:
                return row, col
        return None

    def get_valid_moves(self, piece):
        moves = []
        
        if piece.type == PieceType.PAWN:
            moves.extend(self.get_pawn_moves(piece))
        elif piece.type == PieceType.ROOK:
            moves.extend(self.get_rook_moves(piece))
        elif piece.type == PieceType.KNIGHT:
            moves.extend(self.get_knight_moves(piece))
        elif piece.type == PieceType.BISHOP:
            moves.extend(self.get_bishop_moves(piece))
        elif piece.type == PieceType.QUEEN:
            moves.extend(self.get_queen_moves(piece))
        elif piece.type == PieceType.KING:
            moves.extend(self.get_king_moves(piece))
        
        # Filter moves that would put own king in check
        valid_moves = []
        for move in moves:
            if not self.move_puts_king_in_check(piece, move[0], move[1]):
                valid_moves.append(move)
        
        return valid_moves

    def get_pawn_moves(self, piece):
        moves = []
        direction = -1 if piece.color == PieceColor.WHITE else 1  # White moves up, black moves down
        
        # Forward move
        new_row = piece.row + direction
        if 0 <= new_row < 8 and self.board[new_row][piece.col] is None:
            moves.append((new_row, piece.col))
            
            # Double move from starting position
            if ((piece.color == PieceColor.WHITE and piece.row == 6) or 
                (piece.color == PieceColor.BLACK and piece.row == 1)):
                two_rows_ahead = piece.row + 2 * direction
                if self.board[two_rows_ahead][piece.col] is None:
                    moves.append((two_rows_ahead, piece.col))
        
        # Captures
        capture_cols = [piece.col - 1, piece.col + 1]
        for col in capture_cols:
            if 0 <= col < 8:
                new_row = piece.row + direction
                if 0 <= new_row < 8:
                    target = self.board[new_row][col]
                    if target and target.color != piece.color:
                        moves.append((new_row, col))
        
        # En passant
        if self.en_passant_target:
            ep_row, ep_col = self.en_passant_target
            if piece.row == ep_row and abs(piece.col - ep_col) == 1:
                # Determine capture position
                capture_row = piece.row + direction
                if capture_row == ep_row - direction:  # Only valid if pawn is in the right position
                    moves.append((capture_row, ep_col))
        
        return moves

    def get_rook_moves(self, piece):
        moves = []
        directions = [(0, 1), (0, -1), (1, 0), (-1, 0)]  # Right, Left, Down, Up
        
        for dr, dc in directions:
            for i in range(1, 8):
                new_row = piece.row + i * dr
                new_col = piece.col + i * dc
                
                if not (0 <= new_row < 8 and 0 <= new_col < 8):
                    break
                
                target = self.board[new_row][new_col]
                if target is None:
                    moves.append((new_row, new_col))
                elif target.color != piece.color:
                    moves.append((new_row, new_col))
                    break
                else:
                    break
        
        return moves

    def get_knight_moves(self, piece):
        moves = []
        knight_moves = [
            (-2, -1), (-2, 1), (-1, -2), (-1, 2),
            (1, -2), (1, 2), (2, -1), (2, 1)
        ]
        
        for dr, dc in knight_moves:
            new_row = piece.row + dr
            new_col = piece.col + dc
            
            if 0 <= new_row < 8 and 0 <= new_col < 8:
                target = self.board[new_row][new_col]
                if target is None or target.color != piece.color:
                    moves.append((new_row, new_col))
        
        return moves

    def get_bishop_moves(self, piece):
        moves = []
        directions = [(1, 1), (1, -1), (-1, 1), (-1, -1)]  # Diagonals
        
        for dr, dc in directions:
            for i in range(1, 8):
                new_row = piece.row + i * dr
                new_col = piece.col + i * dc
                
                if not (0 <= new_row < 8 and 0 <= new_col < 8):
                    break
                
                target = self.board[new_row][new_col]
                if target is None:
                    moves.append((new_row, new_col))
                elif target.color != piece.color:
                    moves.append((new_row, new_col))
                    break
                else:
                    break
        
        return moves

    def get_queen_moves(self, piece):
        # Queen moves are combination of rook and bishop moves
        return self.get_rook_moves(piece) + self.get_bishop_moves(piece)

    def get_king_moves(self, piece):
        moves = []
        king_moves = [
            (-1, -1), (-1, 0), (-1, 1),
            (0, -1),           (0, 1),
            (1, -1),  (1, 0),  (1, 1)
        ]
        
        for dr, dc in king_moves:
            new_row = piece.row + dr
            new_col = piece.col + dc
            
            if 0 <= new_row < 8 and 0 <= new_col < 8:
                target = self.board[new_row][new_col]
                if target is None or target.color != piece.color:
                    moves.append((new_row, new_col))
        
        # Castling moves
        if not piece.has_moved:
            # Kingside castling
            if piece.color == PieceColor.WHITE:
                if (not self.white_king_moved and not self.white_rook_h_moved and
                    self.board[7][5] is None and self.board[7][6] is None and
                    self.board[7][7] and self.board[7][7].type == PieceType.ROOK and self.board[7][7].color == PieceColor.WHITE):
                    moves.append((7, 6))  # Kingside castle destination
                    
                # Queenside castling
                if (not self.white_king_moved and not self.white_rook_a_moved and
                    self.board[7][1] is None and self.board[7][2] is None and self.board[7][3] is None and
                    self.board[7][0] and self.board[7][0].type == PieceType.ROOK and self.board[7][0].color == PieceColor.WHITE):
                    moves.append((7, 2))  # Queenside castle destination
            else:  # Black
                if (not self.black_king_moved and not self.black_rook_h_moved and
                    self.board[0][5] is None and self.board[0][6] is None and
                    self.board[0][7] and self.board[0][7].type == PieceType.ROOK and self.board[0][7].color == PieceColor.BLACK):
                    moves.append((0, 6))  # Kingside castle destination
                    
                # Queenside castling
                if (not self.black_king_moved and not self.black_rook_a_moved and
                    self.board[0][1] is None and self.board[0][2] is None and self.board[0][3] is None and
                    self.board[0][0] and self.board[0][0].type == PieceType.ROOK and self.board[0][0].color == PieceColor.BLACK):
                    moves.append((0, 2))  # Queenside castle destination
        
        return moves

    def move_puts_king_in_check(self, piece, dest_row, dest_col):
        # Make temporary move
        original_piece = self.board[dest_row][dest_col]
        original_row, original_col = piece.row, piece.col
        
        self.board[dest_row][dest_col] = piece
        self.board[piece.row][piece.col] = None
        piece.row, piece.col = dest_row, dest_col
        
        # Check if king is in check after move
        in_check = self.is_king_in_check(piece.color)
        
        # Undo move
        self.board[original_row][original_col] = piece
        self.board[dest_row][dest_col] = original_piece
        piece.row, piece.col = original_row, original_col
        
        return in_check

    def is_king_in_check(self, color):
        # Find the king
        king_pos = None
        for row in range(8):
            for col in range(8):
                piece = self.board[row][col]
                if piece and piece.type == PieceType.KING and piece.color == color:
                    king_pos = (row, col)
                    break
            if king_pos:
                break
        
        if not king_pos:
            return False
        
        # Check if any opponent piece can attack the king
        opponent_color = PieceColor.BLACK if color == PieceColor.WHITE else PieceColor.WHITE
        
        for row in range(8):
            for col in range(8):
                piece = self.board[row][col]
                if piece and piece.color == opponent_color:
                    # Temporarily modify piece position to see if it can attack the king
                    original_row, original_col = piece.row, piece.col
                    piece.row, piece.col = row, col
                    moves = self.get_valid_moves_for_opponent(piece)
                    piece.row, piece.col = original_row, original_col
                    
                    if king_pos in moves:
                        return True
        
        return False
    
    def get_valid_moves_for_opponent(self, piece):
        # Simplified version for checking if opponent can attack
        moves = []
        
        if piece.type == PieceType.PAWN:
            direction = 1 if piece.color == PieceColor.WHITE else -1  # Reverse direction for checking attacks
            # Pawn captures
            for dc in [-1, 1]:
                new_row = piece.row + direction
                new_col = piece.col + dc
                if 0 <= new_row < 8 and 0 <= new_col < 8:
                    moves.append((new_row, new_col))
        elif piece.type == PieceType.ROOK:
            moves.extend(self.get_rook_moves(piece))
        elif piece.type == PieceType.KNIGHT:
            moves.extend(self.get_knight_moves(piece))
        elif piece.type == PieceType.BISHOP:
            moves.extend(self.get_bishop_moves(piece))
        elif piece.type == PieceType.QUEEN:
            moves.extend(self.get_queen_moves(piece))
        elif piece.type == PieceType.KING:
            moves.extend(self.get_king_moves(piece)[0:8])  # Only regular king moves, not castling
        
        return moves

    def make_move(self, piece, dest_row, dest_col):
        # Handle special moves
        if piece.type == PieceType.KING:
            # Check for castling
            if abs(dest_col - piece.col) == 2:  # Castling move
                # Kingside castling
                if dest_col > piece.col:
                    rook_start_col = 7
                    rook_dest_col = dest_col - 1
                # Queenside castling
                else:
                    rook_start_col = 0
                    rook_dest_col = dest_col + 1
                
                # Move the rook
                rook = self.board[piece.row][rook_start_col]
                self.board[piece.row][rook_dest_col] = rook
                self.board[piece.row][rook_start_col] = None
                rook.col = rook_dest_col
                rook.has_moved = True
        
        # Handle en passant capture
        if (piece.type == PieceType.PAWN and 
            self.en_passant_target and 
            dest_row == self.en_passant_target[0] and 
            dest_col == self.en_passant_target[1]):
            # Remove the captured pawn
            captured_row = piece.row  # The pawn that was passed
            self.board[captured_row][dest_col] = None
        
        # Record move for en passant possibility check
        if (piece.type == PieceType.PAWN and 
            abs(dest_row - piece.row) == 2):  # Double pawn move
            self.en_passant_target = ((dest_row + piece.row) // 2, dest_col)
        else:
            self.en_passant_target = None
        
        # Capture piece if exists
        captured_piece = self.board[dest_row][dest_col]
        
        # Move the piece
        self.board[dest_row][dest_col] = piece
        self.board[piece.row][piece.col] = None
        piece.row = dest_row
        piece.col = dest_col
        piece.has_moved = True
        
        # Update castling rights
        if piece.type == PieceType.KING:
            if piece.color == PieceColor.WHITE:
                self.white_king_moved = True
            else:
                self.black_king_moved = True
        elif piece.type == PieceType.ROOK:
            if piece.color == PieceColor.WHITE:
                if piece.col == 0:
                    self.white_rook_a_moved = True
                elif piece.col == 7:
                    self.white_rook_h_moved = True
            else:
                if piece.col == 0:
                    self.black_rook_a_moved = True
                elif piece.col == 7:
                    self.black_rook_h_moved = True
        
        # Handle pawn promotion
        if piece.type == PieceType.PAWN:
            if (piece.color == PieceColor.WHITE and piece.row == 0) or \
               (piece.color == PieceColor.BLACK and piece.row == 7):
                self.board[dest_row][dest_col] = Piece(PieceType.QUEEN, piece.color, dest_row, dest_col)
        
        # Switch turn
        self.turn = PieceColor.BLACK if self.turn == PieceColor.WHITE else PieceColor.WHITE
        
        # Add to move history
        self.move_history.append({
            'piece': piece,
            'from': (piece.row, piece.col),
            'to': (dest_row, dest_col),
            'captured': captured_piece
        })
        
        # Clear selection
        self.selected_piece = None
        self.valid_moves = []

    def ai_make_move(self):
        # Simple AI that picks a random valid move
        possible_moves = []
        
        for row in range(8):
            for col in range(8):
                piece = self.board[row][col]
                if piece and piece.color == self.turn:  # AI's color
                    moves = self.get_valid_moves(piece)
                    for move in moves:
                        possible_moves.append((piece, move[0], move[1]))
        
        if possible_moves:
            # For now, pick a random move - in a real implementation, 
            # we'd use minimax or similar algorithm based on difficulty
            piece, dest_row, dest_col = random.choice(possible_moves)
            self.make_move(piece, dest_row, dest_col)

    def run(self):
        running = True
        
        while running:
            mouse_pos = pygame.mouse.get_pos()
            
            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    running = False
                
                if self.game_state == GameState.MENU:
                    if event.type == pygame.MOUSEBUTTONDOWN:
                        buttons = self.draw_main_menu()
                        if buttons["play_button"].collidepoint(event.pos):
                            self.game_state = GameState.GAME_SETUP
                
                elif self.game_state == GameState.GAME_SETUP:
                    if event.type == pygame.MOUSEBUTTONDOWN:
                        buttons = self.draw_game_setup()
                        
                        # Handle difficulty selection
                        for i in range(1, 4):
                            if buttons[f"diff_{i}"].collidepoint(event.pos):
                                self.selected_difficulty = i
                        
                        # Handle color selection
                        if buttons["color_white"].collidepoint(event.pos):
                            self.player_color = PieceColor.WHITE
                        elif buttons["color_black"].collidepoint(event.pos):
                            self.player_color = PieceColor.BLACK
                        
                        # Handle start button
                        if buttons["start"].collidepoint(event.pos):
                            self.game_state = GameState.PLAYING
                            self.board = self.create_initial_board()
                            self.turn = PieceColor.WHITE
                            self.selected_piece = None
                            self.valid_moves = []
                
                elif self.game_state == GameState.PLAYING:
                    if event.type == pygame.MOUSEBUTTONDOWN:
                        # Check if pause button clicked
                        pause_button = self.draw_game_ui()
                        if pause_button.collidepoint(event.pos):
                            self.game_state = GameState.PAUSED
                        
                        # Handle board clicks
                        square = self.get_square_from_mouse(event.pos)
                        if square:
                            row, col = square
                            clicked_piece = self.board[row][col]
                            
                            # If a piece is already selected
                            if self.selected_piece:
                                # Check if clicking on a valid move
                                if (row, col) in self.valid_moves:
                                    self.make_move(self.selected_piece, row, col)
                                    
                                    # If it's now AI's turn, make AI move
                                    if self.turn != self.player_color and not self.game_over:
                                        self.ai_make_move()
                                
                                # Deselect if clicking elsewhere
                                self.selected_piece = None
                                self.valid_moves = []
                            
                            # Select a piece if it belongs to current player
                            elif clicked_piece and clicked_piece.color == self.turn:
                                self.selected_piece = clicked_piece
                                self.valid_moves = self.get_valid_moves(clicked_piece)
                
                elif self.game_state == GameState.PAUSED:
                    if event.type == pygame.MOUSEBUTTONDOWN:
                        buttons = self.draw_pause_menu()
                        
                        if buttons["resume"].collidepoint(event.pos):
                            self.game_state = GameState.PLAYING
                        elif buttons["quit"].collidepoint(event.pos):
                            self.game_state = GameState.MENU
                            self.selected_piece = None
                            self.valid_moves = []
            
            # Drawing
            if self.game_state == GameState.MENU:
                self.draw_main_menu()
            elif self.game_state == GameState.GAME_SETUP:
                self.draw_game_setup()
            elif self.game_state == GameState.PLAYING:
                self.screen.fill(WHITE)
                self.draw_board()
                self.draw_pieces()
                pause_button = self.draw_game_ui()
            elif self.game_state == GameState.PAUSED:
                self.screen.fill(WHITE)
                if hasattr(self, 'board'):
                    self.draw_board()
                    self.draw_pieces()
                    self.draw_game_ui()
                self.draw_pause_menu()
            
            pygame.display.flip()
            self.clock.tick(60)
        
        pygame.quit()
        sys.exit()

if __name__ == "__main__":
    game = ChessGame()
    game.run()