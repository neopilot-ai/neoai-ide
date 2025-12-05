# NeoPilot Python SDK

[![PyPI version](https://badge.fury.io/py/neopilot.svg)](https://badge.fury.io/py/neopilot)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

The official Python SDK for NeoPilot - build AI copilots and agents into your applications.

## Features

- 🚀 Easy integration with LangGraph and LangChain
- 🔄 Built-in support for stateful conversations
- 🛠 Extensible agent framework
- 🔌 ReadyAPI-ready endpoints
- 🤝 Optional CrewAI integration

## Installation

```bash
pip install neopilot
```

With CrewAI support:

```bash
pip install "neopilot[crewai]"
```

## Quick Start

```python
from neopilot import Copilot

# Initialize a copilot
copilot = Copilot()

# Add your tools and configure the copilot
copilot.add_tool(my_custom_tool)

# Run the copilot
response = copilot.run("Your task description here")
```

## Documentation

For detailed documentation and examples, visit [neopilot.ai](https://neopilot.ai)

## Contributing

We welcome contributions! Please see our [Contributing Guidelines](https://github.com/neopilot-ai/neoai-ide/blob/main/CONTRIBUTING.md) for details.

## License

This project is licensed under the MIT License - see the [LICENSE](https://github.com/neopilot-ai/neoai-ide/blob/main/LICENSE) file for details.

## Support

- 📚 [Documentation](https://docs.neopilot.ai)
- 💬 [Discord Community](https://discord.gg/6dffbvGU)
- 🐛 [Issue Tracker](https://github.com/neopilot-ai/neoai-ide/issues)

---

Built with ❤️ by the NeoPilot team
