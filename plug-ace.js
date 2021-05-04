class PlugAce  {

	static get version () {
		return "4.1.0";
	}

	static get modes_marks () {
		this._modes_marks = this._modes_marks || {
			batchfile  : "bat",
			javascript : "js",
			python     : "py",
			text       : "txt",
		};

		return this._modes_marks;
	}

	static _loadCode (url, _) {
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
			_.editor.$blockScrolling = Infinity; // Чтобы отменить какое-то непонятное сообщение в консоли
			_.editor.session.setValue(xhr.responseText);
			if (!_.mode)
				self._setModeByPathname(_.mode || pathname || url, _);
		} // Асинхронно.

		return true;
	}

	static _decor (before, fn, after, logMark) {
		return function(...args) {
			// console.log(logMark);
			var self = this, result;
			if (before)
				args = before(...args);
			result = fn.call(self, ...args);
			if (after)
				result = after(result, ...args);
			return result;
		}
	}

	static _setModeByPathname (pathname, _) {
		ace.config.loadModule('ace/ext/modelist', (module) => {
			var 
				modelist  = ace.require("ace/ext/modelist"),
				foundMode = modelist.getModeForPath(pathname).mode,
				modeName  = foundMode.split("/").pop();
			_.editor.session.setMode(foundMode);
			_.mode = modeName;
			if (_.syntaxMark)
				_.modes_marks[modeName] = _.syntaxMark;
		}); // Установить тип загружаемого файла, если файл загружается.
	}

	static _setSyntaxMark (_) {
		_.wrapper.querySelector(".ace-plug-syntax-mark")
				.textContent = _.modes_marks[_.mode] || _.mode;
	}

	static plug (el, plugOptions={}) {

		function getMode(syntaxMark="") {
			for (var i in _.modes_marks) 
				if (_.modes_marks[i].toLowerCase() == syntaxMark.toLowerCase()) 
					return i;
			return syntaxMark;
		}

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
					var cS = getComputedStyle(el);

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

		el.dataset.plugAceVersion = this.version;

		var 
			self = this,
			_ = Object.assign({ace: ace}, plugOptions),
			ds = el.dataset,
			fNameHtml = "",
			creator  = document.createElement("div");

		_.modes_marks = Object.assign({}, this.modes_marks, _.modes_marks || {});

		_.extension = _.extension || _.ext;
		_.mode      = _.syntax    || _.mode || "";
		_.theme     = _.theme     || _.th   || "iplastic";
		_.fName     = "";

		if (ds) {

			if ("syntax" in ds)
				ds.mode = ds.syntax || "";

			if ("fileName" in ds)
				ds.fName = ds.fileName;

			_.extension  = ds.extension  || ds.ext     || _.extension;
			_.maxLines   = ds.maxLines                 || _.maxLines || Infinity;
			_.mode       = ds.syntax     || ds.mode    || _.mode;
			_.syntaxMark = ds.syntaxMark               || _.syntaxMark; 
			_.theme      = ds.theme      || ds.th      || _.theme;
			_.url        = ds.url                      || _.url;
			_.fName      = ds.fName      || "";
		}

		_.mode  = getMode(_.mode);

		if (!_.mode) {
			if (_.fName && !_.extension)
				this._setModeByPathname(_.fName, _);
			if (_.extension)
				this._setModeByPathname(_.extension, _);
		}

		if (_.syntaxMark && _.mode)
			_.modes_marks[_.mode] = _.syntaxMark;

		if (_.fName)
			fNameHtml = `
				<div class="f-name-tr">
					<div class="f-name-block-el">${_.fName}</div>
				</div>
			`;

		creator.innerHTML = `
			<div class="ace-plug-code-wrapper">
				<div class="ace-plug-code-header">
					<div class="ace-plug-file-name-wr">${fNameHtml}</div>
					<div class="ace-plug-syntax-mark">${""}</div>
				</div>
			</div>
		`;

		var wrapper = _.wrapper = creator.children[0];

		el.parentElement.insertBefore(wrapper, el);
		wrapper.appendChild(el); 
		el.classList.add("ace-plug-code-element");

		var editor = el.editor = _.editor = ace.edit(el); // Создали редактор

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

		editor.setTheme("ace/theme/"+_.theme);

		editor.session.on("changeMode", (e) => {
			var modeId = editor.session.getMode().$id;
			_.mode = modeId.split("/").pop();
			this._setSyntaxMark (_);
		}); // Показать на панели тип синтаксиса при его смене.

		editor.setShowPrintMargin(false); // Убрать линию ограничения длинныстрок
		editor.session.setUseSoftTabs(false); // Писать табы, как табы, а не пробелы
		editor.setAutoScrollEditorIntoView(true); // ?
		editor.setOption("maxLines", _.maxLines); // Максимальное количество строк


		editor.setOptions({
			fontSize : 16,
			enableBasicAutocompletion: true,
			enableSnippets: true,
			enableLiveAutocompletion: false,

			enableEmmet : true,
			wrap : true,

			highlightActiveLine : false,
		}); // Настройки.

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


		if (_.mode) 
			editor.session.setMode("ace/mode/"+_.mode);

		if (_.url) 
			this._loadCode(_.url, _);

		_.mode = _.editor.session.getMode().$id.split("/").pop();
		this._setSyntaxMark (_) // Для инициализации.

		el.defaultPlugOptions = plugOptions;
		el.currentPlugOptions = _;

		return editor;
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
			"Full names of options has priority over abbreviated names.",
			"'Data-options' has priority over options that passed in constructor.",
			"        ",
			"options:",
			"          mode - the syntax too Ace editor. Setts in the ace canonical names.",
			"        syntax - the syntax too Ace editor. Has priority over 'mode'.",
			"    syntaxMark - setts the mark of syntax name to this mode to this editor.",
			"     th, theme - theme to Ace editor.",
			"ext, extension - defines mode ant syntax mark if not setted 'syntax' or 'mode'",
			"      maxLines - maximal count of lines. Default: infinity",
			"        ",
			"data-",
			"         max-lines - ---",
			"              mode - ---",
			"            syntax - ---",
			"       syntax-mark - ---",
			"         th, theme - ---",
			"    ext, extension - ---",
			"               url - loaded content from setted url. ",
			"                         If 'mode' is not setted and if server sent 'Downloaded-file-pathname' header",
			"                         mode would be settled from extension of pathname from this header.",
			"            f-name - Caption with name or path/name of file or other.",
			"",
		].join("\n");
		return helpStr;
	}
}

