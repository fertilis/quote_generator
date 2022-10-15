class App {
    history_sec = 1 * 86400;
    max_points_on_chart_frame = 50;
    
    static async run() {
        const app = new App();
        await app._init();
        app._update_quotes_forever(); // async
    }
    
    constructor() {
        this._selected_ticker_index = 0;
        this._last_timestamp_sec = Math.round(Date.now()/1000, 0) - this.history_sec;
        this._chart_options = {
            axisY: {
                type: Chartist.AutoScaleAxis,
                onlyInteger: true,
            },
        };
        this._chart_frame_offset = 0;
    }
    
    async _init() {
        const resp = await fetch('/api/config');
        const config = await resp.json();
        this.tickers = config.tickers;
        this.tick_interval_sec = config.tick_interval_sec;
        
        this.quotes = [];
        for (let i = 0; i < this.tickers.length; i++) {
            this.quotes.push([]);
        }
        
        const chart_element = document.getElementById('chart');
        chart_element.addEventListener('wheel', (event) => {
            if (event.deltaY < 0) {
                this._chart_frame_offset += 1;
                this._chart_frame_offset = Math.min(
                    this.quotes[0].length - this.max_points_on_chart_frame,
                    this._chart_frame_offset
                )
            } else {
                this._chart_frame_offset -= 1;
                this._chart_frame_offset = Math.max(0, this._chart_frame_offset);
            }
            this._render_chart();
        });
        
        const selector = document.getElementById('ticker_selector');
        for (let i = 0; i < this.tickers.length; i++) {
            const option = document.createElement('option');
            option.textContent = this.tickers[i];
            option.value = i+'';
            selector.appendChild(option);
        }
        selector.addEventListener('change', (event) => {
            this._selected_ticker_index = selector.selectedIndex;
            this._render_chart();
            selector.style.height = '30px'; 
            selector.size = 0;
        });
        selector.addEventListener('mousedown', () => {
            selector.style.height = 'auto'; 
            selector.size = 10; // these are done to nicely format dropdown options
        });
        selector.style.display = 'block';
        
        this._chart_title = document.getElementById('chart_title');
        this._date_label = document.getElementById('date_label');
    }
    
    async _update_quotes_forever() {
        const socket = io();
        
        socket.on('connect', () => {
            setInterval(() => {
                socket.emit('quotes_requested', this._last_timestamp_sec);
            }, 500);
            socket.on('quotes_sent', (response) => {
                if (this._last_timestamp_sec < response.timestamp_sec) {
                    this._last_timestamp_sec = response.timestamp_sec;
                    this._update_quotes_once(response.quotes, response.timestamp_sec);
                    this._render_chart();
                }
            });
        });
    }
            
    _update_quotes_once(quotes, end_timestamp_sec) {
        for (let row = 0; row < this.tickers.length; row++) {
            this.quotes[row] = this.quotes[row].concat(quotes[row]);
        }
    }
    
    _render_chart() {
        this._chart_title.textContent = this.tickers[this._selected_ticker_index];
        
        const quotes = this.quotes[this._selected_ticker_index];
        const end = Math.max(this.max_points_on_chart_frame, quotes.length - this._chart_frame_offset);
        const start = Math.max(0, end - this.max_points_on_chart_frame);
        const chart_points = quotes.slice(start, end);
        
        const n_ticks_from_left_to_end = quotes.length - start;
        const interval_from_end_sec = this._last_timestamp_sec - n_ticks_from_left_to_end * this.tick_interval_sec;
        const datestr = (new Date(interval_from_end_sec*1000)).toLocaleString(); 
        this._date_label.textContent = datestr;
        
        const data = {
            series: [chart_points],
        };
        new Chartist.Line('.ct-chart', data, this._chart_options);
    }
}
