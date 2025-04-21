#!/usr/bin/env node

// 引入必要的模块
import fetch from 'node-fetch';
import { execSync, spawn } from 'child_process';
import process from 'process';
import readline from 'readline';
import clipboardy from 'clipboardy';
import dotenv from 'dotenv';
dotenv.config();

// 获取命令行参数
const args = process.argv.slice(2);
let userQuery = '';
let mode = 'default'; // 默认模式
let hasPipedInput = !process.stdin.isTTY; // 检测是否有管道输入

// 解析参数
if (args.length > 0) {
	if (args[0] === '-s' && !hasPipedInput) {
		//  只有在非管道输入时才解析模式参数
		mode = 'strict'; // 严格命令模式
		userQuery = args.slice(1).join(' ');
	} else if (args[0] === '-c' && !hasPipedInput) {
		//  只有在非管道输入时才解析模式参数
		mode = 'code'; // 代码专家模式
		userQuery = args.slice(1).join(' ');
	} else {
		userQuery = args.join(' '); // 默认模式，所有参数都视为查询内容 (包括管道输入和非管道输入的默认情况)
	}
}

// 如果用户没有提供查询内容 (命令行参数和管道输入都没有)，则打印帮助信息并退出
if (!userQuery && !hasPipedInput) {
	console.log('用法: sai [-s|-c] "<您的查询内容>"');
	console.log('   或: cat <文件路径> | sai [-s|-c] "分析/提问内容描述"');
	console.log('   -s: 严格命令模式，仅返回命令，无任何解释，并提供粘贴执行选项');
	console.log('   -c: 代码专家模式，仅返回代码，无任何解释');
	console.log('   (无参数): 默认模式，根据问题提供命令、代码和解释');
	process.exit(1);
}

// Gemini API 密钥 (从环境变量获取)
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
	console.error('请设置 GEMINI_API_KEY 环境变量。');
	process.exit(1);
}

// Gemini API 模型
const modelName = process.env.GEMINI_MODEL_NAME;
if (!modelName) {
	console.error('请设置 GEMINI_MODEL_NAME 环境变量。');
	process.exit(1);
}

// 获取系统信息 (使用 fastfetch 命令)
let systemInfo = '';
try {
	systemInfo = execSync('fastfetch --logo none').toString().trim();
} catch (error) {
	console.error('获取系统信息失败，请确保已安装 fastfetch 并添加到 PATH 环境变量。');
	systemInfo = '获取系统信息失败';
}

// 发送 API 请求
async function callGeminiAPI(pipedContent = null) {
	//  添加 pipedContent 参数
	let glowInstalled = false;
	try {
		execSync('command -v glow');
		glowInstalled = true;
	} catch (error) {
		glowInstalled = false;
	}

	// 系统指令 (根据模式选择不同的指令) -  移动到 callGeminiAPI 内部，动态生成
	let systemInstruction = '';
	if (mode === 'strict') {
		// 严格命令模式系统指令 (优化指令，要求不使用 Markdown 格式)
		systemInstruction = `你是一个极其严格的终端命令助手。
    你的目标是根据用户的提问，**只提供最精准的终端命令，禁止输出任何解释性文字**。
    即使你认为用户可能不熟悉这个命令，或者需要额外的说明，**你也必须坚持只回复命令本身**。
    **请勿使用任何 Markdown 格式 (例如代码块) 包裹命令，请直接返回纯文本命令**。
    用户会自行通过其他方式 (例如 man 命令或 --help 参数) 了解命令的详细用法。
    请记住，你的回复都必须使用**中文**。
    我的系统信息如下:
    \`\`\`
    ${systemInfo}
    \`\`\`
    `;
	} else if (mode === 'code') {
		// 代码专家模式系统指令
		systemInstruction = `你是一位代码专家助手。
    你的目标是根据用户的提问，**只提供最精准的代码块，禁止输出任何解释性文字**。
    无论用户的问题是什么编程语言，你都应该直接给出可执行的代码，**不要包含任何代码解释、说明或额外的文字**。
    用户是经验丰富的开发者，他们能够理解代码的用途和实现方式。
    请记住，你的回复都必须使用**中文**。
    我的系统信息如下:
    \`\`\`
    ${systemInfo}
    \`\`\`
    `;
	} else {
		// 默认模式系统指令 (保持之前的指令)
		systemInstruction = `你是一个全能终端助手，精通各种操作系统和终端命令。
    你的目标是根据用户的提问提供最佳的终端命令或操作指导。
    当用户明确要求提供命令时，你**必须只回复命令本身**，并在命令后进行**简短的中文解释**。
    如果用户的问题不只是请求命令，你可以提供更全面的解答，包括文字解释、代码示例等。
    请记住，你的回复都必须使用**中文**。
    我的系统信息如下:
    \`\`\`
    ${systemInfo}
    \`\`\`
    `;
	}

	//  动态构建 apiData 对象 (关键修改)
	let apiDataContentsParts = []; // 初始化 contents.parts 数组

	//  添加用户提问 (如果存在)
	if (userQuery) {
		apiDataContentsParts.push({ text: userQuery });
	}

	//  添加管道内容 (如果存在)
	if (pipedContent) {
		apiDataContentsParts.push({ text: pipedContent });
	}

	const apiData = {
		system_instruction: {
			parts: [
				{
					text: systemInstruction, //  使用动态生成的 systemInstruction
				},
			],
		},
		contents: [
			{
				parts: apiDataContentsParts, //  使用动态构建的 parts 数组
			},
		],
		generationConfig: {
			temperature: 0.7,
			topK: 64,
			topP: 0.95,
			maxOutputTokens: 65536,
			responseMimeType: 'text/plain',
		},
		tools: [
			{
				googleSearch: {},
			},
		],
	};

	try {
		// console.log("Debug apiData before fetch:", JSON.stringify(apiData)); //  调试日志

		const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(apiData),
		});

		if (!response.ok) {
			console.error(`API 请求失败，状态码: ${response.status}`);
			const errorText = await response.text();
			console.error('错误详情:', errorText);
			return;
		}

		const responseData = await response.json();

		if (!responseData.candidates || responseData.candidates.length === 0) {
			console.log('API 没有返回任何候选结果。');
			return;
		}

		const textParts = responseData.candidates[0].content.parts;

		if (!textParts || textParts.length === 0) {
			console.log('API 返回的候选结果中没有文本内容。');
			return;
		}

		// 提取所有 text 部分并拼接
		let fullText = '';
		for (const part of textParts) {
			if (part.text) {
				fullText += part.text;
			}
		}

		// 输出处理和交互逻辑
		if (fullText) {
			if (mode === 'strict') {
				// 严格模式下的交互
				let commandToExecute = fullText.trim(); // 获取命令，去除首尾空格

				// 移除 markdown 代码块包裹 (更健壮的移除方式)
				let plainCommandForClipboard = commandToExecute;
				if (commandToExecute.startsWith('```') && commandToExecute.endsWith('```')) {
					plainCommandForClipboard = commandToExecute
						.replace(/^```(bash)?\n?/, '')
						.replace(/```$/, '')
						.trim(); // 移除 ```bash 或 ``` 代码块，更灵活
				} else {
					plainCommandForClipboard = commandToExecute; // 如果不是代码块，则保持原样
				}
				console.log(plainCommandForClipboard); // 如果 glow 未安装，则输出纯文本

				if (!hasPipedInput) {
					//  <-- 关键修改：只在非管道输入时进行交互式询问
					//  创建 readline 接口用于读取用户输入
					const rl = readline.createInterface({
						input: process.stdin,
						output: process.stdout,
					});

					rl.question('是否将命令复制到剪贴板并手动执行? (e=复制并继续/q=退出): ', async (answer) => {
						const lowerAnswer = answer.toLowerCase();
						if (lowerAnswer === 'e') {
							try {
								await clipboardy.write(plainCommandForClipboard); //  复制纯命令到剪贴板
								console.log('命令已复制到剪贴板，请手动粘贴执行。');
							} catch (error) {
								console.error('复制到剪贴板失败:', error);
								console.log('请手动复制命令并执行: ', plainCommandForClipboard); //  提供手动复制的选项
							}
						} else if (lowerAnswer === 'q') {
							console.log('退出。');
						} else {
							console.log('无效的输入，已退出。');
						}
						rl.close(); //  关闭 readline 接口
					});
				} else {
					//  管道输入时，直接复制到剪贴板，不进行交互 (您可以根据需要修改)
					try {
						await clipboardy.write(plainCommandForClipboard);
						console.log('命令已复制到剪贴板 (管道输入，自动复制)。');
					} catch (error) {
						console.error('复制到剪贴板失败:', error);
						console.log('请手动复制命令并执行: ', plainCommandForClipboard);
					}
				}
			} else {
				//  非严格模式，保持原有的输出方式 (glow 或纯文本)
				if (glowInstalled) {
					const glowProcess = spawn('glow', [], {
						stdio: ['pipe', process.stdout, process.stderr],
					});
					glowProcess.stdin.write(fullText);
					glowProcess.stdin.end();
				} else {
					console.log(fullText);
					console.log('\n提示:  要获得更好的 Markdown 渲染效果，请安装 glow (https://github.com/charmbracelet/glow)');
				}
			}
		} else {
			console.log('API 没有返回文本内容。');
		}
	} catch (error) {
		console.error('发生错误:', error);
	}
}

//  处理管道输入
if (hasPipedInput) {
	let pipedData = '';
	process.stdin.on('data', (chunk) => {
		pipedData += chunk;
	});
	process.stdin.on('end', () => {
		//  管道输入时，从 args 中正确解析 模式参数 和 userQuery
		if (args.length > 0) {
			if (args[0] === '-s') {
				mode = 'strict';
				userQuery = args.slice(1).join(' '); // 提取 '-s' 后的参数作为 userQuery
			} else if (args[0] === '-c') {
				mode = 'code';
				userQuery = args.slice(1).join(' '); // 提取 '-c' 后的参数作为 userQuery
			} else {
				userQuery = args.join(' '); //  没有模式参数，所有参数作为 userQuery
			}
		} else {
			userQuery = '请分析以下内容'; //  如果没有提供提问内容，则使用默认提问
		}
		// console.log("Debug userQuery before callGeminiAPI:", userQuery); //  调试日志：输出 userQuery 的值
		callGeminiAPI(pipedData); //  将管道内容传递给 callGeminiAPI
	});
} else {
	callGeminiAPI(); //  没有管道输入，按原方式调用
}
