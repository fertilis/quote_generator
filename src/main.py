import numpy as np
import threading
import traceback
import argparse
import random
import time

from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit


class Config:
    quote_type = np.uint16
    max_stored_ticks = 7 * 86400 # enough space for 7 days
    tickers = [ 'ticker_{:02}'.format(i) for i in range(100) ]
    tick_interval_sec = 1.0
    initial_quote = 0
    max_quote = np.iinfo(quote_type).max
    min_quote = np.iinfo(quote_type).min
    
    def n_ticks(self, duration_sec: int)->int:
        return int(duration_sec / self.tick_interval_sec)
    


class QuoteGenerator:
    '''
    Stores quotes for all tickers in a single numpy array.
    This array is treated as a circular array.
    '''
    def __init__(self, config):
        self._config = config
        n_rows = len(config.tickers)
        n_cols = config.n_ticks(config.max_stored_ticks)
        self._quotes = np.zeros((n_rows, n_cols), dtype=config.quote_type)
        self._end_position = 0 # where writing ended in the circular array
        self._ever_reached_the_end_of_array = False
        self._end_timestamp_sec = None # timestamp of the tick at end_position-1
        

    def get_quotes(self, since_timestamp_sec: int)->'(dtype[n_tickers][n_ticks], ts)':
        max_ticks = self._quotes.shape[1]
        if self._ever_reached_the_end_of_array:
            n_generated_ticks = max_ticks
        else:
            n_generated_ticks = self._end_position
            
        duration_sec = max(0, int(time.time()) - since_timestamp_sec)
        n_requested_ticks = self._config.n_ticks(duration_sec)
        
        n_ticks = min(n_requested_ticks, n_generated_ticks)
        pos = self._end_position
        if n_ticks == 0:
            next_timestamp_to_request_from_sec = self._end_timestamp_sec
        else:
            next_timestamp_to_request_from_sec = self._end_timestamp_sec + 1
        
        if n_ticks <= pos:
            # points from left-hand side of the array only
            quotes = self._quotes[:, (pos - n_ticks):pos]
        else:
            # points from both right-hand side and left-hand side
            quotes = np.concatenate(
                (
                    self._quotes[:, (max_ticks-(n_ticks-pos)):],
                    self._quotes[:, :pos]
                ),
                axis=1
            )
        return quotes, next_timestamp_to_request_from_sec
        

    def start_generating_quotes(self):
        threading.Thread(target=self._generate_quotes_forever, daemon=True).start()
        

    def _generate_quotes_forever(self):
        interval = self._config.tick_interval_sec
        self._end_timestamp_sec = int(time.time() - self._config.tick_interval_sec)
        while True:
            try:
                self._generate_quotes_once()
            except Exception:
                traceback.print_exc()
            time.sleep(interval)
            

    def _generate_quotes_once(self):
        moment_sec = int(time.time())
        elapsed_sec = moment_sec - self._end_timestamp_sec
        self._end_timestamp_sec = moment_sec
        n_ticks_to_fill = self._config.n_ticks(elapsed_sec)
        n_tickers, max_ticks = self._quotes.shape
        
        while n_ticks_to_fill > 0:
            pos = self._end_position
            if pos == 0 and not self._ever_reached_the_end_of_array:
                self._quotes[:, pos] = self._config.initial_quote
            else:
                prev_pos = pos - 1
                if prev_pos == -1:
                    prev_pos = max_ticks - 1
                
                self._quotes[:, pos] = np.array([
                    self._generate_quote(self._quotes[i, prev_pos])
                    for i in range(n_tickers)
                ], dtype=self._config.quote_type)
                
            if pos == max_ticks - 1:
                self._ever_reached_the_end_of_array = True
            self._end_position += 1
            self._end_position %= max_ticks
            n_ticks_to_fill -= 1
            

    def _generate_quote(self, last_quote: int)->int:
        if random.random() < 0.5:
            movement = -1
        else:
            movement = 1
        quote = last_quote + movement
        if quote > self._config.max_quote:
            quote = self._config.max_quote
        if quote < self._config.min_quote:
            quote = self._config.min_quote
        return quote
    
    
    

app = Flask(__name__)
socketio = SocketIO(app)
    
    
@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/config')
def get_config():
    return {
        'tickers': config.tickers,
        'tick_interval_sec': config.tick_interval_sec,
    }
    

@socketio.on('quotes_requested')
def handle_quotes_requested(since_timestamp_sec: int):
    quotes, timestamp_sec = quote_generator.get_quotes(since_timestamp_sec)
    response = {
        'quotes': quotes.tolist(),
        'timestamp_sec': timestamp_sec,
    }
    emit('quotes_sent', response)
    
    
    
if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--port', type=int)
    args = p.parse_args()
    port = args.port or 8080
    
    config = Config()
    quote_generator = QuoteGenerator(config)
    quote_generator.start_generating_quotes()
    socketio.run(app, host="0.0.0.0", port=port, allow_unsafe_werkzeug=True)
