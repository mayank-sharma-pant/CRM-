import os
import re

def replace_currency_in_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace $ not followed by { (which would be a template literal)
    # We also avoid replacing $ in common JS patterns if any, but in JSX/TSX
    # $ is almost always template literal or currency.
    new_content = re.sub(r'\$(?!\{)', '₹', content)
    
    if content != new_content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        return True
    return False

def main():
    root_dir = r'c:\Projects\CRM-\frontend\app'
    count = 0
    for root, dirs, files in os.walk(root_dir):
        for file in files:
            if file.endswith(('.jsx', '.js', '.tsx', '.ts')):
                full_path = os.path.join(root, file)
                if replace_currency_in_file(full_path):
                    print(f"Updated: {full_path}")
                    count += 1
    print(f"Total files updated: {count}")

if __name__ == "__main__":
    main()
