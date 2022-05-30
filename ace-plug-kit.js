(function () {
	const 
		version = "7.0.0",

		_default_ = Object.defineProperties({}, {

			editorOpts: { value: {
				fontSize                 : 16,
				enableBasicAutocompletion: true,
				enableSnippets           : true,
				enableLiveAutocompletion : false,

				enableEmmet              : true,
				wrap                     : true,

				highlightActiveLine      : false,

				showPrintMargin          : false,
				useSoftTabs              : false,
				autoScrollEditorIntoView : true,
				maxLines                 : 30,

				showInvisibles           : true,
				theme                    : "ace/theme/kuroir",
			}},

			plugOpts: { value: {
				modeMarks: this.modeMarks,
				// theme    : "iplastic",
				// maxLines : 30,
			}},

			modeMarks : { value: {
				batchfile  : "bat",
				javascript : "js",
				python     : "py",
				text       : "txt",
			}},

		});

	



	const API = window.acePK = {
		version,
		default: _default_,
		help,
		plug,
		retabulate,
		getThemes,
		themesToConsole,
	};

	return;

	function help () {
		const helpStr = [
			"",
			"'Data-options' has priority over options that passed in constructor.",
			"options:",
			"      syntax - the syntax to Ace editor. Supported short aliases.",
			"  syntaxMark - setts the mark of syntax name to this mode to this editor.",
			"       theme - theme to Ace editor.",
			"    maxLines - maximal count of lines. Default: infinity",
			"        ",
			"data-",
			"       syntax - ---",
			"  syntax-mark - ---",
			"        theme - ---",
			"    max-lines - ---",
			"       f-name - Caption with name or path/name of file or other.",
			"          url - loaded content from setted url. ",
			"                    If 'mode' is not setted and if server sent 'Downloaded-file-pathname' header",
			"                     mode would be settled from extension of pathname from this header.",
			"    sel-lines - select given lines. For example '3,5-7' selected lines 3,5,6,7.",
			"",
		].join("\n");
		return helpStr;
	}

	function plug (el, plugOpts={}, editorOpts={}) {

		el.dataset.acePlugKitVersion = this.version;

		const 
			self = this,
			ds = el.dataset,
			o = Object.assign(
				{},
				_default_.plugOpts,
				plugOpts,
				ds,
			),
			edOpts = Object.assign(
				{},
				_default_.editorOpts,
				editorOpts,
			);
		o.maxLines = parseInt(o.maxLines);
		let
			fNameHtml = "",
			creator  = document.createElement("div");

		o.modeMarks = Object.assign(
			{}, 
			_default_.modeMarks, 
			plugOpts.modeMarks || {}
		);

		_performEditEl(el, o);
		_setStyle();
		const editor = el.editor = o.editor = ace.edit(el); // Создали редактор
		_setEditor(editor, el, o.wrapper, o, edOpts);
		return editor;
	}


	function _setEditor (editor, el, wrapper, o, edOpts) {

		wrapper.querySelector(".ace-plug-kit__syntax-mark").onclick = () => {editor.showSettingsMenu()};

		editor.setOption = 
			_decor(null, editor.setOption, afterOptionsDecor, 
				"editor.setOption()"); // Задекорировать editor.setOption

		editor.session.setOption = 
			_decor(null, editor.session.setOption, afterOptionsDecor, 
				"editor.session.setOption()"); // Задекорировать editor.session.setOption

		editor.renderer.setOption = 
			_decor(null, editor.renderer.setOption, afterOptionsDecor, 
				"editor.renderer.setOption()"); // Задекорировать editor.renderer.setOption

		editor.renderer.setTheme = 
			_decor(beforeThemeDecor, editor.renderer.setTheme, null, 
				"editor.renderer.setTheme()"); // Задекорировать editor.renderer.setTheme

		editor.commands.addCommand({
			name: "showKeyboardShortcuts",
			bindKey: {win: "Ctrl-Alt-h", mac: "Command-Alt-h"},
			exec: function(editor) {
				ace.config.loadModule("ace/ext/keybinding_menu", function(module) {
					module.init(editor);
					editor.showKeyboardShortcuts()
				})
			}
		}); // Добавить меню шорткатов

		ace.config.loadModule('ace/ext/settings_menu', function (module) {
			module.init(editor);
		});
		editor.commands.addCommands([{
			name: "showSettingsMenu",
			bindKey: {win: "Ctrl-q", mac: "Command-q"},
			exec: function(editor) {
				editor.showSettingsMenu();
			},
			readOnly: true,
		}]); // Добавить меню настроек

		editor.session.on("changeMode", (e) => {
			var modeId = editor.session.getMode().$id;
			// o.mode = modeId.split("/").pop();
			_setSyntaxMark (o);
		}); // Показать на панели тип синтаксиса при его смене.

		_setSyntaxMark (o) // Для инициализации.

		editor.setOptions(edOpts); // Настройки.

		if (o.maxLines)
			editor.setOption("maxLines", o.maxLines * 1); // Максимальное количество строк

		if (o.theme)
			editor.setTheme(`ace/theme/${o.theme}`);

		if (o.url) 
			_loadCode(o.url, o);

		if (o.syntax) {
			const mode = _getModeFromSyntax(o.syntax, o);
			if (mode) 
				editor.session.setMode("ace/mode/"+mode);
		}

		if (o.selLines)
			_selectLines(editor, o.selLines);

		return;

		function afterOptionsDecor(result, ...args) {
			// console.log(`afterOptionsDecor()`, result, args);
		}

		function beforeThemeDecor(...args) {
			// console.log(`beforeThemeDecor()`, args);
			// console.trace("decor_setTheme");
			// console.log(`args[1]`, args[1]);
			
			// Вторым аргументом `args[1]` передаётся каллбек, который исполнится 
			// после изменения темы. Его нужно задекорировать функцией, которая 
			// пересветит метку синтаксиса.
			args[1] = _decor(null, (args[1] || function() {}), () => {
				setTimeout(() => {
					const cS = getComputedStyle(el);

					wrapper.style.backgroundColor = cS.backgroundColor;
					wrapper.style.color = (editor.renderer.theme.isDark)? "#fff" : "#aaa";
					wrapper.querySelector(".ace-plug-kit__syntax-mark").style.textShadow = `
						0 0 10px ${cS.backgroundColor},
						0 0 10px ${cS.backgroundColor},
						0 0 10px ${cS.backgroundColor},
						0 0 10px ${cS.backgroundColor},
						0 0 10px ${cS.backgroundColor},
						0 0 10px ${cS.backgroundColor},
						0 0 10px ${cS.backgroundColor},
						0 0 10px ${cS.backgroundColor},
						0 0 10px ${cS.backgroundColor},
						0 0 10px ${cS.backgroundColor}
					`;

				})
			})
			return args;
		}
	}

	function retabulate (el, defIndent=0, tabChar="\t") {
		var 
			str = el.textContent,
			newStr = "",
			sArr = str.split("\n"),
			minT = Infinity,
			emptyT = /^[\s]*$/,
			tArr = []


		if (emptyT.exec(sArr[0])) {

			sArr.shift();
			emptyT.exec(sArr[sArr.length - 1]) && sArr.pop();

			for (var i = 0; i < sArr.length; i++) 
				tArr[i] = countTabs(sArr[i]);


			for (var i = 0; i < sArr.length; i++) 
				if (tArr[i] < minT)
					minT = tArr[i];

			for (var i = 0; i < sArr.length; i++) {
				i && (newStr += "\n");
				newStr += getTabs(defIndent) + sArr[i].slice(minT);
			}

			el.textContent = newStr;
			el.classList.add("retabulated");

			return newStr;
		}

		return str;


		function countTabs(str) {
			if (emptyT.exec(str))
				return Infinity;

			var n = 0;
			while (str[n] == tabChar)
				n ++;

			return n;
		}

		function getTabs(n) {
			var str = "";
			for (var i = 0; i < n; i++)
				str += tabChar;

			return str;
		}
	}

	function _performEditEl(el, o) {
		if (o.fName)
			fNameHtml = `
				<div class="ace-plug-kit__f-name-tr">
					<div class="ace-plug-kit__f-name-block-el">${o.fName}</div>
				</div>
			`;

		const wrapper = o.wrapper = eHTML(`
			<div class="ace-plug-kit__code-wrapper">
				<div class="ace-plug-kit__code-header">
					<div class="ace-plug-kit__file-name-wr">${fNameHtml}</div>
					<div class="ace-plug-kit__syntax-mark">${""}</div>
				</div>
			</div>
		`);

		el.parentElement.insertBefore(wrapper, el);
		wrapper.appendChild(el); 
		el.classList.add("ace-plug-kit__code-element");
	}

	function _selectLines(editor, nums) {
		try {
			const ranges = [];
			nums.split(",").forEach((v) => {
				let [a, b] = v.split("-").map(v => parseInt(v));
				b ||= a;
				if (a) {
					for (let i = a; i <= b; i ++) {
						editor.selection.setSelectionRange(
							new ace.Range(i - 1, 0, i - 1, 0));
						editor.selection.moveCursorLineStart();
						editor.selection.selectLineEnd();
						ranges.push(editor.selection.getRange());
					}
				}
			});
			ranges.push(new ace.Range(0,0,0,0));
			ranges.forEach((v) => {
				if (v)
					v.cursor = v.start, editor.selection.addRange(v);
			});
		} catch (err) {
			console.error("(!)", el, err);
		}
	}

	function _loadCode (url, o) {
		var 
			urlOb = new URL(url, location.href),
			self = this,
			xhr = new XMLHttpRequest();
		xhr.open('GET', url, true);
		xhr.addEventListener("readystatechange", xhrResponse, false);
		xhr.setRequestHeader('Downloaded-file-host_pathname', location.host+location.pathname);
		xhr.send();

		function xhrResponse (e) {
			if (xhr.readyState != 4) 
				return;
			var pathname = xhr.getResponseHeader("Downloaded-file-pathname");
			o.editor.$blockScrolling = Infinity; // Чтобы отменить какое-то непонятное сообщение в консоли
			o.editor.session.setValue(xhr.responseText);
			if (! o.syntax)
				_setModeByPathname(pathname || urlOb.pathname, o);
			if (o.selLines)
				_selectLines(o.editor, o.selLines);

		} // Асинхронно.

		return true;
	}

	function _decor (before, fn, after, logMark=null) {
		return function(...args) {
			// console.log(logMark);
			const self = this;
			let   result;
			if (before)
				args = before(...args);
			result = fn.call(self, ...args);
			if (after)
				result = after(result, ...args);
			return result;
		}
	}

	function _setModeByPathname (pathname, o) {
		ace.config.loadModule('ace/ext/modelist', (module) => {
			var 
				modelist  = ace.require("ace/ext/modelist"),
				foundMode = modelist.getModeForPath(pathname).mode,
				modeName  = foundMode.split("/").pop();
			o.editor.session.setMode(foundMode);
			if (o.syntaxMark)
				o.modeMarks[modeName] = o.syntaxMark;
		}); // Установить тип загружаемого файла, если файл загружается.
	}

	function _setSyntaxMark (o) {
		const mode = o.editor.session.getMode().$id.split("/").slice(-1);
		o.wrapper.querySelector(".ace-plug-kit__syntax-mark")
				.textContent = o.syntaxMark || o.modeMarks[mode] || mode;
	}

	function _getModeFromSyntax (syntaxMark, o) {
		const ob = o.modeMarks;
		return Object.keys(ob).find(v => ob[v] == syntaxMark) || syntaxMark;
	}

	function eHTML (code, shell=null) {
		const _shell = 
			! shell                  ? document.createElement("div") :
			typeof shell == "string" ? document.createElement(shell) :
			typeof shell == "object" ? shell :
				null;
		_shell.innerHTML = code;
		return _shell.children[0];
	}

	function _setStyle () {
		const 
			cssCode = `
				.ace-plug-kit__code-wrapper {
				  margin: 25px 5px 15px 5px;
				  border: 1px solid #ccc;
				  border-top-width: 1px;
				  font-size: 16px; }
				  .ace-plug-kit__code-wrapper > .ace-plug-kit__code-header > .ace-plug-kit__file-name-wr {
				    font-family: consolas;
				    font-size: 16px;
				    height: 1.2em;
				    margin-top: calc(-1.2em - 1px); }
				    .ace-plug-kit__code-wrapper > .ace-plug-kit__code-header > .ace-plug-kit__file-name-wr > .ace-plug-kit__f-name-tr {
				      display: inline-block; }
				      .ace-plug-kit__code-wrapper > .ace-plug-kit__code-header > .ace-plug-kit__file-name-wr > .ace-plug-kit__f-name-tr > .ace-plug-kit__f-name-block-el {
				        color: #333;
				        display: inline-block;
				        font-weight: bold;
				        font-style: italic;
				        padding: 0px 20px; }
				  .ace-plug-kit__code-wrapper > .ace-plug-kit__code-header > .ace-plug-kit__syntax-mark {
				    font-size: 20px;
				    font-weight: bold;
				    font-family: verdana;
				    text-align: right;
				    display: block;
				    font-style: italic;
				    padding: 0 30px;
				    margin-top: -15px;
				    height: 1.2em;
				    cursor: pointer; }
				  .ace-plug-kit__code-wrapper > .ace-plug-kit__code-header > .ace-plug-kit__code-element {
				    position: relative; }
			 `;

		const styleClassName = `ace-plug-kit__theme-style`;

		const styleAlreadyExists = [].some.call(
			document.querySelectorAll(`style.${styleClassName}`), 
			(v) => v.textContent === cssCode
		);

		if (! styleAlreadyExists) {
			const style = eHTML(`<style class="${styleClassName}"></style>`);
			style.textContent = cssCode;
			const firstEl = document.head.children[0];
			if (firstEl)
				document.head.insertBefore(style, firstEl);
			else
				document.head.appendChild(style);
		}
	}

	function themesToConsole() {
		getThemes().then(console.log);
	}

	async function getThemes() {
		const module = await new Promise((rsl) => {
			ace.config.loadModule('ace/ext/themelist', rsl);
		});
		return {
			all  : module.themes.map(v => v.name),
			dark : module.themes.filter(v =>  v.isDark).map(v => v.name),
			light: module.themes.filter(v => !v.isDark).map(v => v.name),
		}
	}

})()

