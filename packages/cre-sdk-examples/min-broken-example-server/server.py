#!/usr/bin/env python3
import sys
from http.server import HTTPServer, BaseHTTPRequestHandler

class SimpleHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'text/plain')
        self.end_headers()
        value = sys.argv[1] if len(sys.argv) > 1 else ''
        self.wfile.write(value.encode())

    def log_message(self, format, *args):
        pass

if __name__ == '__main__':
    port = 8800
    server = HTTPServer(('localhost', port), SimpleHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.shutdown()
