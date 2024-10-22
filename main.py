import http.server
import socketserver
import os

# 서버 옵션을 미리 정의한 상대 경로들로 설정
SERVER_OPTIONS = {
    1: "topology_map_editor/out",
    2: "server_folder_2",
    3: "server_folder_3"
}

def run_server(directory, port=8000):
    os.chdir(directory)  # 루트 경로를 선택한 폴더로 변경
    handler = http.server.SimpleHTTPRequestHandler
    with socketserver.TCPServer(("", port), handler) as httpd:
        print(f"Serving at http://localhost:{port}")
        httpd.serve_forever()

def main():
    print("=== Simple Python Web Server ===")
    print("Choose a server to run:")
    for option, path in SERVER_OPTIONS.items():
        print(f"{option}. {path}")
    print("===============================")

    try:
        print("1) Topology map server")
        choice = int(input("Select server: ").strip())
        if choice in SERVER_OPTIONS:
            relative_path = SERVER_OPTIONS[choice]
            absolute_path = os.path.abspath(relative_path)

            if os.path.isdir(absolute_path):
                print(f"Starting server with root directory: {absolute_path}")
                run_server(absolute_path)
            else:
                print("Invalid directory. The path does not exist.")
        else:
            print("Invalid choice. Please select a valid option.")
    except ValueError:
        print("Invalid input. Please enter a number.")

if __name__ == "__main__":
    main()
