import os
import shutil
from tkinter import Tk, filedialog, messagebox, ttk
import threading

def extract_mp3_files(source_folder, progress_callback=None):
    # 目标文件夹 - 当前目录下的 Music 子文件夹
    target_folder = os.path.join(os.getcwd(), "Music")
    
    # 如果目标文件夹不存在，则创建它
    if not os.path.exists(target_folder):
        os.makedirs(target_folder)
    
    # 遍历源文件夹及其子文件夹
    total_files = 0
    processed_files = 0
    
    # 首先计算总文件数用于进度条
    for root, _, files in os.walk(source_folder):
        for file in files:
            if file.lower().endswith('.mp3'):
                total_files += 1
    
    if total_files == 0:
        return False, "未找到任何 .mp3 文件"
    
    # 开始复制文件
    for root, _, files in os.walk(source_folder):
        for file in files:
            if file.lower().endswith('.mp3'):
                source_path = os.path.join(root, file)
                target_path = os.path.join(target_folder, file)
                
                # 处理文件名冲突
                counter = 1
                while os.path.exists(target_path):
                    name, ext = os.path.splitext(file)
                    target_path = os.path.join(target_folder, f"{name}_{counter}{ext}")
                    counter += 1
                
                try:
                    shutil.copy2(source_path, target_path)
                    processed_files += 1
                    if progress_callback:
                        progress_callback(processed_files, total_files)
                except Exception as e:
                    print(f"复制文件 {file} 时出错: {e}")
    
    return True, f"成功提取 {processed_files}/{total_files} 个 .mp3 文件到 {target_folder}"

class MP3ExtractorApp:
    def __init__(self, root):
        self.root = root
        root.title("MP3 文件提取工具")
        
        # 设置窗口大小和位置
        window_width = 400
        window_height = 200
        screen_width = root.winfo_screenwidth()
        screen_height = root.winfo_screenheight()
        center_x = int(screen_width/2 - window_width/2)
        center_y = int(screen_height/2 - window_height/2)
        root.geometry(f'{window_width}x{window_height}+{center_x}+{center_y}')
        
        # 创建界面元素
        self.label = ttk.Label(root, text="选择包含MP3文件的文件夹:")
        self.label.pack(pady=10)
        
        self.select_button = ttk.Button(root, text="选择文件夹", command=self.select_folder)
        self.select_button.pack(pady=5)
        
        self.progress = ttk.Progressbar(root, orient="horizontal", length=300, mode="determinate")
        self.progress.pack(pady=10)
        
        self.status_label = ttk.Label(root, text="")
        self.status_label.pack(pady=5)
        
        self.extract_button = ttk.Button(root, text="开始提取", state="disabled", command=self.start_extraction)
        self.extract_button.pack(pady=5)
        
        self.selected_folder = ""
    
    def select_folder(self):
        folder_selected = filedialog.askdirectory()
        if folder_selected:
            self.selected_folder = folder_selected
            self.status_label.config(text=f"已选择: {folder_selected}")
            self.extract_button.config(state="enabled")
    
    def update_progress(self, current, total):
        progress = (current / total) * 100
        self.progress['value'] = progress
        self.status_label.config(text=f"正在处理: {current}/{total} 文件...")
        self.root.update_idletasks()
    
    def start_extraction(self):
        if not self.selected_folder:
            messagebox.showerror("错误", "请先选择文件夹")
            return
        
        # 禁用按钮防止重复点击
        self.select_button.config(state="disabled")
        self.extract_button.config(state="disabled")
        
        # 在新线程中执行提取操作，避免界面冻结
        def extraction_thread():
            success, message = extract_mp3_files(self.selected_folder, self.update_progress)
            self.root.after(0, lambda: self.extraction_complete(success, message))
        
        threading.Thread(target=extraction_thread, daemon=True).start()
    
    def extraction_complete(self, success, message):
        if success:
            messagebox.showinfo("完成", message)
        else:
            messagebox.showerror("错误", message)
        
        # 重置界面
        self.progress['value'] = 0
        self.select_button.config(state="enabled")
        self.extract_button.config(state="disabled")
        self.status_label.config(text=message)

if __name__ == "__main__":
    root = Tk()
    app = MP3ExtractorApp(root)
    root.mainloop()