"""
================================================================================
SEARCH ALGORITHMS WEB SERVER
================================================================================
Run this file to launch the Search Algorithms Visualizer in your web browser:
    python server.py
================================================================================
"""

import http.server
import socketserver
import webbrowser
import os
import sys

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def log_message(self, format, *args):
        # Clean logging
        sys.stdout.write("%s - - [%s] %s\n" %
                         (self.address_string(),
                          self.log_date_time_string(),
                          format%args))

def run_server():
    os.chdir(DIRECTORY)
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        url = f"http://localhost:{PORT}/index.html"
        print("=" * 65)
        print(" SEARCH ALGORITHMS WEB APPLICATION RUNNING!")
        print("=" * 65)
        print(f" URL: {url}")
        print(" Press Ctrl+C in this terminal to stop the server.")
        print("=" * 65)
        
        try:
            webbrowser.open(url)
        except Exception:
            pass

        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server. Goodbye!")
            httpd.server_close()

if __name__ == "__main__":
    run_server()
