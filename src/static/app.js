class App {
    max_points_on_chart_frame = 50;
    history_duration_sec = 300;
    
    static async run() {
        const app = new App();
        await app._init();
        app._update_quotes_forever(); // async
    }
    
    constructor() {
        this._selected_ticker_index = 0;
        this._start_index_to_request_from = 0;
        this._end_timestamp_sec = Math.round(Date.now()/1000, 0);
        this._chart_options = {
            axisY: {
                type: Chartist.AutoScaleAxis,
                onlyInteger: true,
            },
        };
        this._chart_frame_offset = 0;
        this._tick_interval_sec = 1.0;
        this._tickers = [];
        this._quotes = [];
        this._chart_title = null;
        this._date_label = null;
    }
    
    async _init() {
        await this._fetch_config(); // sets this._tickers
        for (let i = 0; i < this._tickers.length; i++) {
            this._quotes.push([]);
        }
        this._setup_chart_scroll();
        const selector = this._setup_selector();
        this._chart_title = document.getElementById('chart_title');
        this._date_label = document.getElementById('date_label');
        await this._fetch_quote_history();
        this._show_message('График можно прокручивать колесом прокрутки');
        selector.style.display = 'block';
    }
    
    async _fetch_config() {
        const response = await fetch('/api/config');
        const config = await response.json();
        this._tickers = config.tickers;
        this._tick_interval_sec = config.tick_interval_sec;
    }
    
    _setup_chart_scroll() {
        const chart_element = document.getElementById('chart');
        chart_element.addEventListener('wheel', (event) => {
            if (event.deltaY < 0) {
                this._chart_frame_offset += 1;
                this._chart_frame_offset = Math.min(
                    this._quotes[0].length - this.max_points_on_chart_frame,
                    this._chart_frame_offset
                )
            } else {
                this._chart_frame_offset -= 1;
                this._chart_frame_offset = Math.max(0, this._chart_frame_offset);
            }
            this._render_chart();
        });
    }
    
    _setup_selector() {
        const selector = document.getElementById('ticker_selector');
        for (let i = 0; i < this._tickers.length; i++) {
            const option = document.createElement('option');
            option.textContent = this._tickers[i];
            option.value = i+'';
            selector.appendChild(option);
        }
        // changes to height and size are done to nicely format dropdown options
        selector.addEventListener('change', (event) => {
            this._selected_ticker_index = selector.selectedIndex;
            this._render_chart();
            selector.style.height = '30px'; 
            selector.size = 0;
        });
        selector.addEventListener('mousedown', () => {
            selector.style.height = 'auto'; 
            selector.size = 10; 
        });
        return selector;
    }
    
    async _fetch_quote_history() {
        const history_since_timestamp_sec = Math.round(Date.now()/1000, 0) - this.history_duration_sec;
        const response = await fetch(`/api/quotes?from_timestamp_sec=${history_since_timestamp_sec}`);
        const data = await response.json();
        this._update_quotes(data);
    }
    
    _update_quotes(data) {
        this._start_index_to_request_from = data.next_index;
        this._end_timestamp_sec = data.end_timestamp_sec;
        if (data.quotes[0].length > 0) {
            for (let row = 0; row < this._tickers.length; row++) {
                this._quotes[row] = this._quotes[row].concat(data.quotes[row]);
            }
            this._render_chart();
        }
    }
    
    async _update_quotes_forever() {
        const socket = io();
        
        socket.on('connect', () => {
            socket.emit('quotes_requested', this._start_index_to_request_from);
            setInterval(() => {
                socket.emit('quotes_requested', this._start_index_to_request_from);
            }, 500);
            socket.on('quotes_sent', (data) => {
                if (this._start_index_to_request_from != data.next_index) {
                    this._update_quotes(data)
                }
            });
        });
    }
    
    _render_chart() {
        this._chart_title.textContent = this._tickers[this._selected_ticker_index];
        
        const quotes = this._quotes[this._selected_ticker_index];
        const end = Math.max(this.max_points_on_chart_frame, quotes.length - this._chart_frame_offset);
        const start = Math.max(0, end - this.max_points_on_chart_frame);
        const chart_points = quotes.slice(start, end);
        
        const datestr = (new Date(this._end_timestamp_sec*1000)).toLocaleString(); 
        this._date_label.textContent = datestr;
        
        const data = {
            series: [chart_points],
        };
        new Chartist.Line('.ct-chart', data, this._chart_options);
    }
    
    _show_message(text) {
        document.getElementById('chart_bottom').textContent = text;
    }
}
