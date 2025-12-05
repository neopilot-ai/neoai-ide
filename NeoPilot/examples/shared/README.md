# NeoPilot Standardized Dependencies

This directory contains standardized dependency templates and utilities for all NeoPilot Python agent examples.

## 🎯 **Strategy Overview**

**Primary Package Manager:** Poetry  
**Pip Compatibility:** Full support via `requirements.txt`  
**Version Strategy:** Exact pinning for reproducible builds

## 📋 **Canonical Versions**

All examples use these exact versions, synchronized with the main SDK:

| Package         | Version    | Source                      |
| --------------- | ---------- | --------------------------- |
| `neopilot`    | `0.1.49`   | Latest stable               |
| `langchain`     | `0.3.21`   | Main SDK lock               |
| `langgraph`     | `0.4.8`    | Exact pin - working version |
| `langsmith`     | `0.3.18`   | Main SDK lock               |
| `openai`        | `^1.68.2`  | Main SDK compatible         |
| `readyapi`       | `^0.115.5` | Standard framework          |
| `uvicorn`       | `^0.29.0`  | ASGI server                 |
| `python-dotenv` | `^1.0.0`   | Environment management      |

### 🔧 **Optional Dependencies**

- `crewai` = `0.118.0` (for CrewAI examples)
- `tavily-python` = `^0.5.1` (for research examples)

## 🚀 **Usage**

### **For Poetry (Recommended)**

1. Copy `pyproject-template.toml` to your example directory:

   ```bash
   cp examples/shared/pyproject-template.toml examples/your-example/agent/pyproject.toml
   ```

2. **Important**: Add packages configuration for your project structure:

   ```toml
   [tool.poetry]
   name = "agent"
   version = "0.1.0"
   description = ""
   authors = ["NeoPilot"]
   readme = "README.md"
   packages = [{include = "your_package_name"}]  # Add this line
   ```

3. Create a basic README.md file:

   ```bash
   echo "# Your Agent Name" > README.md
   ```

4. Modify for project-specific dependencies:

   ```toml
   # Add project-specific deps after the standard ones
   crewai = "0.118.0"  # For CrewAI examples
   ```

5. Install dependencies:
   ```bash
   cd examples/your-example/agent
   poetry install
   ```

### **For pip**

1. Copy `requirements-template.txt`:

   ```bash
   cp examples/shared/requirements-template.txt examples/your-example/agent/requirements.txt
   ```

2. Install dependencies:
   ```bash
   cd examples/your-example/agent
   pip install -r requirements.txt
   ```

## 🔄 **Automatic Synchronization**

Use the sync script to bulk update all examples:

```bash
cd examples/shared/utils
python sync-deps.py --all        # Update all examples
python sync-deps.py ../my-agent  # Update specific example
```

### **What the sync script does:**

- ✅ Updates `pyproject.toml` with canonical versions
- ✅ Generates `requirements.txt` for pip compatibility
- ✅ Preserves project-specific dependencies
- ✅ Ensures version consistency across all examples

## 📚 **Version Management Strategy**

### **Exact Pinning (=)**

- `neopilot`, `langchain`, `langgraph`, `langsmith`
- Ensures reproducible builds
- Eliminates version drift

### **Compatible Ranges (^)**

- `openai`, `readyapi`, `uvicorn`, `python-dotenv`
- Allows bug fixes and compatible updates
- Maintains backward compatibility

### **Why This Approach?**

1. **Reproducible Builds** - Exact versions for core dependencies
2. **Pip Compatibility** - Works with both Poetry and pip
3. **Easy Maintenance** - Automated sync across all examples
4. **Version Consistency** - No more version conflicts between examples
5. **Developer Experience** - Simple copy-paste setup

## 🔍 **Verification**

To verify your example follows the standard:

```bash
# Check Poetry setup
poetry check
poetry show neopilot langchain langgraph

# Check pip compatibility
pip install -r requirements.txt --dry-run
```

## 🚨 **Critical Rules**

1. **Never** change core dependency versions manually
2. **Always** use the sync script for updates
3. **Keep** `pyproject.toml` and `requirements.txt` in sync
4. **Update** both files when adding project-specific dependencies

## 🆘 **Troubleshooting**

### **Version Conflicts**

```bash
# Reset to canonical versions
cd examples/shared/utils
python sync-deps.py ../your-example/agent
```

### **Poetry Lock Issues**

```bash
rm poetry.lock
poetry install
```

### **Pip Compatibility Issues**

```bash
# Regenerate requirements.txt
cd examples/shared/utils
python sync-deps.py ../your-example/agent
```

---

## 📁 **File Structure**

```
examples/shared/
├── README.md                    # This documentation
├── pyproject-template.toml      # Poetry template
├── requirements-template.txt    # pip template
└── utils/
    └── sync-deps.py            # Synchronization script
```

This standardization ensures all NeoPilot examples work reliably for both Poetry and pip users while maintaining version consistency across the entire project.
