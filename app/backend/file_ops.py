import shutil
import os


def has_enough_space(file_path):
    """
    Checks if there is enough free space on the disk to create an encrypted copy.
    """
    # Get the size of the file we want to encrypt
    file_size = os.path.getsize(file_path)

    # Get free space on the drive where the file is
    # (shutil.disk_usage returns total, used, free)
    _, _, free_space = shutil.disk_usage(os.path.dirname(file_path))

    # We need at least the file size + a little buffer (e.g., 10MB)
    required_space = file_size + (10 * 1024 * 1024)

    return free_space >= required_space