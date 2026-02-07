import os

# "." means the current directory you are in right now
root = "."

# Define the folder structure
folders = [
    f"{root}/app/backend",
    f"{root}/app/frontend/screens",
    f"{root}/app/frontend/widgets",
    f"{root}/app/frontend/assets",
    f"{root}/data/vault_storage",
    f"{root}/tests",
]

# Define the files to create
files = [
    f"{root}/main.py",
    f"{root}/config.py",
    f"{root}/requirements.txt",
    f"{root}/README.md",
    f"{root}/app/__init__.py",
    f"{root}/app/backend/__init__.py",
    f"{root}/app/backend/crypto.py",
    f"{root}/app/backend/key_manager.py",
    f"{root}/app/backend/database.py",
    f"{root}/app/backend/file_ops.py",
    f"{root}/app/backend/session.py",
    f"{root}/app/frontend/__init__.py",
    f"{root}/app/frontend/app_manager.py",
    f"{root}/app/frontend/styles.py",
    f"{root}/app/frontend/screens/__init__.py",
    f"{root}/app/frontend/screens/login_ui.py",
    f"{root}/app/frontend/screens/vault_ui.py",
    f"{root}/app/frontend/screens/settings_ui.py",
    f"{root}/app/frontend/widgets/__init__.py",
    f"{root}/app/frontend/widgets/custom_buttons.py",
    f"{root}/app/frontend/widgets/file_list_item.py",
    f"{root}/data/.gitignore",
    f"{root}/tests/__init__.py",
    f"{root}/tests/test_crypto.py",
    f"{root}/tests/test_database.py",
]

print(f"Setting up project in current directory...")

# Create Folders
for folder in folders:
    os.makedirs(folder, exist_ok=True)
    print(f"✔ Folder ready: {folder}")

# Create Files
for file in files:
    if not os.path.exists(file):
        with open(file, 'w') as f:
            pass # Create empty file
        print(f"✔ File created: {file}")
    else:
        print(f"⚠ Skipped (already exists): {file}")

print("\nAll done! Your file structure is ready.")