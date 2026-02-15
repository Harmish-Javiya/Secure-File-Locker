import os
import ctypes
import platform


def hide_folder(path):
    """
    Hides a folder from the OS file explorer.
    """
    system_name = platform.system()

    try:
        if system_name == 'Windows':
            # Use Windows API to set the "Hidden" attribute (0x02)
            # FILE_ATTRIBUTE_HIDDEN = 2
            ret = ctypes.windll.kernel32.SetFileAttributesW(path, 0x02)
            if not ret:
                print(f"Warning: Could not hide folder {path}")

        else:
            # Linux/macOS: Rename folder to start with a dot (if not already)
            dirname, basename = os.path.split(path)
            if not basename.startswith('.'):
                new_name = '.' + basename
                new_path = os.path.join(dirname, new_name)
                os.rename(path, new_path)
                return new_path  # Return new path since it changed

    except Exception as e:
        print(f"Error hiding folder: {e}")

    return path  # Return original path if no rename happened