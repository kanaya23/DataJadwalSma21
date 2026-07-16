import http.server
import socketserver
import webbrowser
import threading
import time

PORT = 8000
Handler = http.server.SimpleHTTPRequestHandler

def open_browser():
    time.sleep(1)
    webbrowser.open(f"http://localhost:{PORT}/")

def main():
    threading.Thread(target=open_browser).start()
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Server started at http://localhost:{PORT}/")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass

if __name__ == "__main__":
    main()
