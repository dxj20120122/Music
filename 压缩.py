import os
import json
import logging
from tkinter import Tk, filedialog
from htmlmin import minify
from csscompressor import compress as css_compress
from jsmin import jsmin
from PIL import Image
import io

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('file_compressor.log'),
        logging.StreamHandler()
    ]
)

class FileCompressor:
    def __init__(self):
        self.compression_stats = {
            'total_files': 0,
            'compressed_files': 0,
            'skipped_files': 0,
            'original_size': 0,
            'compressed_size': 0
        }

    def select_directory(self):
        """弹出文件夹选择对话框"""
        root = Tk()
        root.withdraw()  # 隐藏主窗口
        folder_selected = filedialog.askdirectory(title="选择要压缩的文件夹")
        return folder_selected

    def compress_html(self, content):
        """压缩HTML内容"""
        try:
            return minify(
                content,
                remove_comments=True,
                remove_empty_space=True,
                reduce_boolean_attributes=True,
                remove_optional_attribute_quotes=False
            )
        except Exception as e:
            logging.error(f"HTML压缩失败: {str(e)}")
            return content

    def compress_css(self, content):
        """压缩CSS内容"""
        try:
            return css_compress(content)
        except Exception as e:
            logging.error(f"CSS压缩失败: {str(e)}")
            return content

    def compress_js(self, content):
        """压缩JavaScript内容"""
        try:
            return jsmin(content)
        except Exception as e:
            logging.error(f"JS压缩失败: {str(e)}")
            return content

    def compress_json(self, content):
        """压缩JSON内容"""
        try:
            data = json.loads(content)
            return json.dumps(data, separators=(',', ':'))
        except Exception as e:
            logging.error(f"JSON压缩失败: {str(e)}")
            return content

    def compress_image(self, file_path, quality=80):
        """压缩图片文件"""
        try:
            with Image.open(file_path) as img:
                # 保存原始大小
                original_size = os.path.getsize(file_path)
                
                # 如果是PNG，转换为更高效的格式
                if img.format == 'PNG':
                    img = img.convert('P', palette=Image.ADAPTIVE, colors=256)
                
                # 保存到内存中先比较大小
                buffer = io.BytesIO()
                img.save(buffer, format=img.format, quality=quality, optimize=True)
                compressed_size = buffer.getbuffer().nbytes
                
                # 只有当压缩后更小才保存
                if compressed_size < original_size:
                    with open(file_path, 'wb') as f:
                        f.write(buffer.getvalue())
                    return True
                return False
        except Exception as e:
            logging.error(f"图片压缩失败 {file_path}: {str(e)}")
            return False

    def process_file(self, file_path):
        """处理单个文件"""
        try:
            original_size = os.path.getsize(file_path)
            self.compression_stats['original_size'] += original_size
            self.compression_stats['total_files'] += 1

            file_ext = os.path.splitext(file_path)[1].lower()
            compressed = False

            # 根据文件类型选择压缩方法
            if file_ext == '.html':
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                compressed_content = self.compress_html(content)
                if len(compressed_content) < len(content):
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(compressed_content)
                    compressed = True

            elif file_ext == '.css':
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                compressed_content = self.compress_css(content)
                if len(compressed_content) < len(content):
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(compressed_content)
                    compressed = True

            elif file_ext == '.js':
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                compressed_content = self.compress_js(content)
                if len(compressed_content) < len(content):
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(compressed_content)
                    compressed = True

            elif file_ext == '.json':
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                compressed_content = self.compress_json(content)
                if len(compressed_content) < len(content):
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(compressed_content)
                    compressed = True

            elif file_ext in ('.jpg', '.jpeg', '.png'):
                compressed = self.compress_image(file_path)

            # 更新统计信息
            if compressed:
                compressed_size = os.path.getsize(file_path)
                self.compression_stats['compressed_size'] += compressed_size
                self.compression_stats['compressed_files'] += 1
                logging.info(f"成功压缩: {file_path} (原始: {original_size}字节, 压缩后: {compressed_size}字节)")
            else:
                self.compression_stats['compressed_size'] += original_size
                self.compression_stats['skipped_files'] += 1
                logging.info(f"跳过文件(无需压缩): {file_path}")

        except Exception as e:
            logging.error(f"处理文件 {file_path} 时出错: {str(e)}")
            self.compression_stats['skipped_files'] += 1
            self.compression_stats['compressed_size'] += original_size

    def process_directory(self, directory):
        """递归处理目录中的所有文件"""
        for root, _, files in os.walk(directory):
            for file in files:
                file_path = os.path.join(root, file)
                self.process_file(file_path)

    def show_stats(self):
        """显示压缩统计信息"""
        saved = self.compression_stats['original_size'] - self.compression_stats['compressed_size']
        ratio = (saved / self.compression_stats['original_size'] * 100) if self.compression_stats['original_size'] > 0 else 0
        
        print("\n压缩统计:")
        print(f"总文件数: {self.compression_stats['total_files']}")
        print(f"压缩文件数: {self.compression_stats['compressed_files']}")
        print(f"跳过文件数: {self.compression_stats['skipped_files']}")
        print(f"原始总大小: {self.compression_stats['original_size'] / 1024:.2f} KB")
        print(f"压缩后总大小: {self.compression_stats['compressed_size'] / 1024:.2f} KB")
        print(f"节省空间: {saved / 1024:.2f} KB ({ratio:.2f}%)")

    def run(self):
        """运行压缩工具"""
        print("=== 文件压缩工具 ===")
        directory = self.select_directory()
        
        if not directory:
            print("未选择文件夹，程序退出。")
            return
            
        print(f"正在处理文件夹: {directory}")
        
        confirm = input("确定要压缩此文件夹中的文件吗? (y/n): ").lower()
        if confirm != 'y':
            print("操作取消。")
            return
            
        self.process_directory(directory)
        self.show_stats()
        
        print("\n压缩完成! 详细信息请查看日志文件: file_compressor.log")

if __name__ == "__main__":
    try:
        compressor = FileCompressor()
        compressor.run()
    except KeyboardInterrupt:
        print("\n用户中断操作。")
    except Exception as e:
        logging.critical(f"程序发生严重错误: {str(e)}", exc_info=True)
        print(f"发生错误: {str(e)} 详细信息请查看日志文件。")