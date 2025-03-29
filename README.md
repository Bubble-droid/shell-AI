# shell-AI
Using Node.js to simply use Gemini in the terminal
## sai.js: Gemini 驱动的智能终端助手

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**`sai.js`** 是一个基于 Node.js 开发的命令行工具，它利用 Google Gemini API 的强大自然语言处理能力，为您的终端提供智能化的辅助功能。  无论是查询终端命令、分析代码脚本，还是获取操作指导，`sai.js` 都能以简洁高效的方式，助您提升终端操作效率。

## ✨ 功能特性

*   **智能命令查询:**  只需用自然语言描述您的需求，`sai.js` 就能为您提供精准的终端命令，并可选提供简要解释。
*   **代码专家模式:**  快速获取各种编程语言的代码示例，无需繁琐搜索，直接在终端获取可执行的代码片段。
*   **严格命令模式:**  仅返回纯粹的命令或代码，避免任何解释性文字干扰，专注于命令的快速获取和执行。
*   **管道符支持:**  无缝集成管道符，可以将文件内容或命令输出作为上下文输入，进行深度分析或转换。
*   **命令粘贴执行:**  在严格命令模式下，提供交互式选项，一键将生成的命令复制到剪贴板，方便用户直接粘贴执行。
*   **Markdown 渲染:**  使用 [glow](https://github.com/charmbracelet/glow) (可选) 对输出内容进行 Markdown 渲染，提供更美观和易读的终端显示效果。
*   **系统信息集成:**  自动获取并利用您的系统信息，使 Gemini API 能够提供更贴合您当前环境的建议和代码。
*   **多模式灵活切换:**  通过命令行参数 `-s` 和 `-c`，轻松切换严格命令模式和代码专家模式，满足不同场景下的需求。

## 🛠️ 实现原理

`sai.js` 脚本的核心在于利用 Node.js 的强大功能，结合 Google Gemini API 的自然语言处理能力，构建一个智能化的终端助手。其主要实现步骤如下：

1.  **接收用户输入:**  通过 `process.argv` 获取用户在命令行中输入的查询内容和参数，并检测是否存在管道输入 (`process.stdin.isTTY`)。
2.  **解析命令行参数:**  解析用户是否使用了 `-s` (严格命令模式) 或 `-c` (代码专家模式) 参数，并提取用户查询内容。
3.  **构建系统指令:**  根据解析到的模式参数，动态构建不同的系统指令 (`systemInstruction`)，以引导 Gemini API 按照特定模式进行回复。系统指令中包含了当前系统信息 (`fastfetch --logo none`)，以便 Gemini API 更好地理解用户环境。
4.  **构造 API 请求:**  使用 `node-fetch` 库，向 Google Gemini API 发送 POST 请求。请求体中包含：
    *   `system_instruction`:  包含根据模式选择的系统指令。
    *   `contents`:  包含用户查询内容，以及通过管道符接收的内容 (如果存在)。  **重要:**  用户提问信息和管道内容被分离为两个 `text` 对象，以提供更清晰的上下文。
    *   `generationConfig`:  包含 API 生成内容的配置参数，例如温度、最大输出 tokens 等。
    *   `tools`:  启用 Google Search 工具 (可选，当前未使用)。
5.  **发送 API 请求并获取响应:**  调用 Gemini API，获取 API 返回的 JSON 响应数据。
6.  **解析 API 响应:**  从 JSON 响应中提取文本内容 (`responseData.candidates[0].content.parts`)。
7.  **输出处理和交互:**
    *   **严格命令模式 (`-s`):**  提取纯命令，去除 Markdown 代码块包裹，并输出到终端。  在非管道输入时，提供交互式选项，询问用户是否将命令复制到剪贴板。  管道输入时，自动复制命令到剪贴板。
    *   **代码专家模式 (`-c`) 和默认模式:**  将 API 返回的完整文本内容输出到终端。如果安装了 `glow`，则使用 `glow` 进行 Markdown 渲染，否则输出纯文本。
8.  **错误处理:**  脚本包含了详细的错误处理机制，例如 API 请求失败、API 没有返回内容等情况，都会在终端输出相应的错误信息。

## 🚀 使用方法

### 📦 前置依赖

*   **Node.js:**  确保您的系统中已安装 Node.js 运行环境 (建议 v18 或更高版本)。
*   **npm 或 yarn:**  Node.js 包管理器，用于安装依赖库。
*   **Google Gemini API Key:**  您需要拥有 Google Gemini API 的 API Key，并将其设置为名为 `GEMINI_API_KEY` 的环境变量。  [获取 Gemini API Key 指南](https://makersuite.google.com/app/apikey)
*   **可选依赖:**
    *   **glow:**  用于 Markdown 渲染，提供更美观的终端输出效果 ([安装 glow 指南](https://github.com/charmbracelet/glow))。
    *   **fastfetch:**  用于快速获取系统信息，提供更精准的 AI 辅助 ([安装 fastfetch 指南](https://github.com/fastfetch-cli/fastfetch))。

### ⚙️ 安装步骤

1.  **克隆仓库 (如果您从 GitHub 获取):**
    ```bash
    git clone https://github.com/Bubble-droid/shell-AI.git
    cd shell-AI
    ```

2.  **安装依赖:**
    ```bash
    npm install # 或 yarn install
    ```

3.  **设置执行权限:**
    ```bash
    chmod +x sai.js
    ```

4.  **设置 Gemini API Key 环境变量:**
    将您的 Gemini API Key 设置为名为 `GEMINI_API_KEY` 的环境变量。  具体设置方法取决于您的操作系统和终端环境。  例如，在 Linux 或 macOS 中，您可以编辑 `~/.bashrc` 或 `~/.zshrc` 文件，添加以下行：

    ```bash
    export GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
    ```
    并执行 `source ~/.bashrc` 或 `source ~/.zshrc` 使环境变量生效。

### ⌨️ 命令行使用

*   **默认模式 (普通查询):**
    ```bash
    ./sai.js "<您的查询内容>"
    例如: ./sai.js "如何查看磁盘空间"
    例如: ./sai.js "创建一个名为 test.txt 的文件"
    ```
    在默认模式下，`sai.js` 会根据您的问题类型，提供命令、代码以及必要的解释说明。

*   **严格命令模式 (`-s` 参数):**
    ```bash
    ./sai.js -s "<您的命令查询内容>"
    例如: ./sai.js -s "查看当前目录下的所有文件"
    例如: ./sai.js -s "重启 Nginx 服务"
    ```
    使用 `-s` 参数，`sai.js` 将 **仅返回命令本身**，没有任何解释性文字。  在非管道输入时，会提示您是否将命令复制到剪贴板。

*   **代码专家模式 (`-c` 参数):**
    ```bash
    ./sai.js -c "<您的代码查询内容>"
    例如: ./sai.js -c "用 javascript 写一个快速排序函数"
    例如: ./sai.js -c "python 如何读取 csv 文件"
    ```
    使用 `-c` 参数，`sai.js` 将 **仅返回代码块本身**，没有任何解释性文字。

*   **管道符输入:**
    ```bash
    cat <文件路径> | ./sai.js "<分析/提问内容描述>"
    例如: cat ping-check.sh | ./sai.js "将这个脚本改为javascript实现"
    例如: cat data.json | ./sai.js "分析这个 json 文件"
    ```
    您可以使用管道符 `|` 将文件内容或命令输出传递给 `sai.js`，并结合用户提问，进行更复杂的分析和处理。  使用 `-s` 参数进行管道输入时，命令会自动复制到剪贴板。

### 💡 示例

1.  **查询 Linux 下查看 CPU 使用率的命令:**

    ```bash
    ./sai.js "linux 查看 cpu 使用率"
    ```

    `sai.js` 可能返回:

    ```markdown
    查看 CPU 使用率，可以使用 `top` 命令或 `htop` 命令。

    **top 命令:**

    \`\`\`bash
    top
    \`\`\`

    **htop 命令 (如果已安装):**

    \`\`\`bash
    htop
    \`\`\`

    这两个命令都会实时显示系统中各个进程的 CPU 使用率，以及系统总体的 CPU 使用情况。  `htop` 比 `top` 界面更友好，功能也更强大一些。

    请根据您的需求选择使用。
    ```

2.  **使用严格命令模式查询重启 Docker 服务的命令:**

    ```bash
    ./sai.js -s "重启 docker 服务"
    ```

    `sai.js` 将 **仅返回命令**:

    ```bash
    sudo systemctl restart docker
    ```

3.  **使用代码专家模式获取 Python 快速排序代码:**

    ```bash
    ./sai.js -c "python 快速排序"
    ```

    `sai.js` 将 **仅返回 Python 代码**:

    ```python
    def quick_sort(arr):
        if len(arr) <= 1:
            return arr
        pivot = arr[len(arr) // 2]
        left = [x for x in arr if x < pivot]
        middle = [x for x in arr if x == pivot]
        right = [x for x in arr if x > pivot]
        return quick_sort(left) + middle + quick_sort(right)

    # 示例
    arr = [3,6,8,10,1,2,1]
    print(quick_sort(arr))
    ```

4.  **分析 Shell 脚本 (管道符输入):**

    ```bash
    cat my_script.sh | ./sai.js "分析这个 shell 脚本的功能和潜在问题"
    ```

    `sai.js` 将分析 `my_script.sh` 脚本的内容，并尝试解释其功能，指出潜在的风险或改进建议。

## 📜 许可证

本项目使用 MIT License 开源许可证。  您可以自由地使用、修改和分发本项目代码，详情请参阅 [LICENSE](LICENSE) 文件。

## ✍️ 作者

Gemini-Athena (AI 代码助手)

---

**欢迎贡献代码和提出 issue!**  如果您在使用过程中遇到任何问题，或者有任何改进建议，欢迎在 GitHub 仓库中提出 issue 或提交 Pull Request。  让我们共同完善 `sai.js`，打造更强大的智能终端助手！
