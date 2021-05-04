class PlugAce  {

	static get version () {
		return "4.1.0";
	}

	static get editorOpts () {
		this._editorOpts = this._editorOpts ||  {
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
		};
		return this._editorOpts;
	}

	static get setOpts () {
		this._setOpts = this._setOpts || {
			modeMarks: this.modeMarks,
			// theme    : "iplastic",
			// maxLines : 30,
		};

		return this._setOpts;
	}

	static get modeMarks () {
		this._modeMarks = this._modeMarks || {
			batchfile  : "bat",
			javascript : "js",
			python     : "py",
			text       : "txt",
		};

		return this._modeMarks;
	}

	static plug (el, setOpts={}, editorOpts={}) {

		el.dataset.plugAceVersion = this.version;

		const 
			self = this,
			ds = el.dataset,
			o = Object.assign(
				{},
				this.setOpts,
				setOpts,
				ds,
			),
			edO = Object.assign(
				{},
				this.editorOpts,
				editorOpts,
			);
		o.maxLines = parseInt(o.maxLines);
		let
			fNameHtml = "",
			creator  = document.createElement("div");

		Object.assign(o.modeMarks, setOpts.modeMarks || {});
		o.mode = getMode(o.syntax) || o.mode;

		if (o.fName)
			fNameHtml = `
				<div class="f-name-tr">
					<div class="f-name-block-el">${o.fName}</div>
				</div>
			`;

		const wrapper = o.wrapper = this.eHTML(`
			<div class="ace-plug-code-wrapper">
				<div class="ace-plug-code-header">
					<div class="ace-plug-file-name-wr">${fNameHtml}</div>
					<div class="ace-plug-syntax-mark">${""}</div>
				</div>
			</div>
		`);

		el.parentElement.insertBefore(wrapper, el);
		wrapper.appendChild(el); 
		el.classList.add("ace-plug-code-element");

		const editor = el.editor = o.editor = ace.edit(el); // Создали редактор

		this._setEditor(editor, el, wrapper, o, edO);

		el.defaultPlugOptions = Object.assign({}, this.setOpts);
		el.fCallPlugOptions   = setOpts;
		el.currentPlugOptions = o;

		return editor;

		function getMode(syntaxMark="". o) {
			for (var i in o.modeMarks) 
				if (o.modeMarks[i].toLowerCase() == syntaxMark.toLowerCase()) 
					return i;
			return syntaxMark;
		}
	}

	static _setEditor (editor, el, wrapper, o, edO) {
		const self = this;

		wrapper.querySelector(".ace-plug-syntax-mark").onclick = () => {editor.showSettingsMenu()};

		editor.setOption = 
			this._decor(null, editor.setOption, afterOptionsDecor, 
				"editor.setOption()"); // Задекорировать editor.setOption

		editor.session.setOption = 
			this._decor(null, editor.session.setOption, afterOptionsDecor, 
				"editor.session.setOption()"); // Задекорировать editor.session.setOption

		editor.renderer.setOption = 
			this._decor(null, editor.renderer.setOption, afterOptionsDecor, 
				"editor.renderer.setOption()"); // Задекорировать editor.renderer.setOption

		editor.renderer.setTheme = 
			this._decor(beforeThemeDecor, editor.renderer.setTheme, null, 
				"editor.renderer.setTheme()"); // Задекорировать editor.renderer.setTheme

		editor.setTheme(o.theme ? `ace/theme/${o.theme}` : editor.getTheme());

		editor.session.on("changeMode", (e) => {
			var modeId = editor.session.getMode().$id;
			o.mode = modeId.split("/").pop();
			this._setSyntaxMark (o);
		}); // Показать на панели тип синтаксиса при его смене.

		// editor.setShowPrintMargin(false); // Убрать линию ограничения длинныстрок
		// editor.session.setUseSoftTabs(false); // Писать табы, как табы, а не пробелы
		// editor.setAutoScrollEditorIntoView(true); // ?
		if (o.maxLines)
			editor.setOption("maxLines", o.maxLines * 1); // Максимальное количество строк


		editor.setOptions(edO); // Настройки.

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


		if (o.mode) 
			editor.session.setMode("ace/mode/"+o.mode);

		if (o.url) 
			this._loadCode(o.url, o);

		o.mode = o.editor.session.getMode().$id.split("/").pop();
		this._setSyntaxMark (o) // Для инициализации.


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
			args[1] = self._decor(null, (args[1] || function() {}), () => {
				setTimeout(() => {
					const cS = getComputedStyle(el);

					wrapper.style.backgroundColor = cS.backgroundColor;
					wrapper.style.color = (editor.renderer.theme.isDark)? "#fff" : "#aaa";
					wrapper.querySelector(".ace-plug-syntax-mark").style.textShadow = `
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

	static retabulate (el, defIndent=0, tabChar="\t") {
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

	static help () {
		var helpStr = [
			"",
			"'Data-options' has priority over options that passed in constructor.",
			"options:",
			"        mode - the syntax to Ace editor. Setts in the ace canonical names.",
			"      syntax - the syntax to Ace editor. Setts in a short aliases. Has priority over 'mode'.",
			"  syntaxMark - setts the mark of syntax name to this mode to this editor.",
			"       theme - theme to Ace editor.",
			"    maxLines - maximal count of lines. Default: infinity",
			"        ",
			"data-",
			"         mode - ---",
			"       syntax - ---",
			"  syntax-mark - ---",
			"        theme - ---",
			"    max-lines - ---",
			"       f-name - Caption with name or path/name of file or other.",
			"          url - loaded content from setted url. ",
			"                    If 'mode' is not setted and if server sent 'Downloaded-file-pathname' header",
			"                     mode would be settled from extension of pathname from this header.",
			"",
		].join("\n");
		return helpStr;
	}

	static _loadCode (url, o) {
		var 
			self = this,
			xhr = new XMLHttpRequest();
		xhr.open('POST', url, true);
		xhr.addEventListener("readystatechange", xhrResponse, false);
		xhr.setRequestHeader('Downloaded-file-host_pathname', location.host+location.pathname);
		xhr.send();

		function xhrResponse (e) {
			if (xhr.readyState != 4) 
				return;
			var pathname = xhr.getResponseHeader("Downloaded-file-pathname");
			o.editor.$blockScrolling = Infinity; // Чтобы отменить какое-то непонятное сообщение в консоли
			o.editor.session.setValue(xhr.responseText);
			if (!o.mode)
				self._setModeByPathname(o.mode || pathname || url, o);
		} // Асинхронно.

		return true;
	}

	static _decor (before, fn, after, logMark=null) {
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

	static _setModeByPathname (pathname, o) {
		ace.config.loadModule('ace/ext/modelist', (module) => {
			var 
				modelist  = ace.require("ace/ext/modelist"),
				foundMode = modelist.getModeForPath(pathname).mode,
				modeName  = foundMode.split("/").pop();
			o.editor.session.setMode(foundMode);
			o.mode = modeName;
			if (o.syntaxMark)
				o.modeMarks[modeName] = o.syntaxMark;
		}); // Установить тип загружаемого файла, если файл загружается.
	}

	static _setSyntaxMark (o) {
		o.wrapper.querySelector(".ace-plug-syntax-mark")
				.textContent = o.syntaxMark || o.modeMarks[o.mode] || o.mode;
	}
	static eHTML (code, shell=null) {
		const _shell = 
			! shell                  ? document.createElement("div") :
			typeof shell == "string" ? document.createElement(shell) :
			typeof shell == "object" ? shell :
				null;
		_shell.innerHTML = code;
		return _shell.children[0];
	}
}

