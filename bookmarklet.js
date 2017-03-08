/*
	(c) 2014, 2016, 2017 Digital Humanities Lab, Utrecht University
	Author: Julian Gonggrijp, j.gonggrijp@uu.nl
	
	Automated word-in-context scraper for text corpora:
	http://corpus.rae.es/cordenet.html
	http://corpus.rae.es/creanet.html
	http://corpus.byu.edu/
	http://web.frl.es/CORPES/view/inicioExterno.view
	http://web.frl.es/CREA/view/inicioExterno.view
	http://web.frl.es/CNDHE/view/inicioExterno.view
*/

(function() {
	'use strict';
	
	var target,          // frame or window containing first page of results
	    parser = new DOMParser(),
	    data = [],       // will contain the extracted data in subarrays
	    progressSteps,   // number of requests to complete (including jQuery)
	    progress = 0,    // number of requests completed so far
	    csvSpecial = /[,; "'\t\n\r]/;  // used in sanitize()

	// Produces an object with domain-specific code, if available.
	// Refer to the Readme for a discussion of the purpose of each function.
	var domains = {
		'corpus.byu.edu': {
			columns: [
				'number', 'meta1', 'meta2',
				'contextLeft', 'sample', 'contextRight',
			],
			progressRegex: /(\d+)\s*\/\s*(\d+)/,
			init: function() {
				target = frames[4];
				this.rowsPerPage = frames[2].document.querySelector('#kh').value;
				var navtable = target.document.querySelector('#resort td'),
				    progress;
				if (navtable && (progress = navtable.textContent.match(
					this.progressRegex
				))) {
					progressSteps = Number(progress[2]);
				} else progressSteps = 1;
			},
			getNext: function(doc) {
				var navtable = doc.querySelector('#resort td'),
				    progress;
				if (!navtable || !(progress = navtable.textContent.match(
					this.progressRegex
				))) return;
				var anchor = navtable.querySelectorAll('a')[4];
				if (anchor && Number(progress[1]) < Number(progress[2])) {
					return anchor.getAttribute('href');
				}
				// else return undefined
			},
			scrape1page: function(doc) {
				var columns = doc.querySelectorAll('#t1 td').length,
				    row, cells, i;
				for (i = 1; i <= this.rowsPerPage; ++i) {
					row = doc.querySelector('#t' + i);
					if (!row) continue;
					cells = row.querySelectorAll('td');
					data.push([
						cells[0].textContent,
						cells[1].textContent,
						cells[2].textContent,
						cells[columns - 3].textContent,
						cells[columns - 2].textContent,
						cells[columns - 1].textContent,
					]);
				}
			}
		},
		'corpus.rae.es': {
			columns: [
				'number', 'century', 'text',
				'contextLeft', 'sample', 'contextRight',
			],
			init: function() {
				target = window;
				var navnode = document.querySelector('td.texto[align="center"]');
				progressSteps = Number(navnode.textContent.split(/[^0,1-9]+/)[2]);
			},
			getNext: function(doc) {
				var anchor = doc.querySelector('td > a');
				if (!anchor || anchor.textContent !== 'Siguiente') return;
				return anchor.getAttribute('href');
			},
			translateHeader: function(columnHeader) {
				switch (columnHeader) {
				// \xBA might be replaced by \ufffd on encoding mismatch.
				case 'N\ufffd':
				case 'N\xBA':
					return 'number';
				case 'A\xD1O':
					return 'date';
				case 'T\xCDTULO':
					return 'text';
				case 'CONCORDANCIA':
					return 'contextLeft';
				default:
					return null;
				}
			},
			columnPositions: function(section, titleLine) {
				var firstMatch = section.innerHTML.split('\n')[1],
				    columnHeads = titleLine.split(/(\s+)/),
				    anchorParts = firstMatch.split(/<a.+?">|<\/a>/),
				    columns = {},
				    currentHeader,
				    range,
				    index = 0,
				    l, i;
				for (l = columnHeads.length, i = 0; i < l; i += 2) {
					currentHeader = this.translateHeader(columnHeads[i]);
					range = [index];
					index += columnHeads[i].length;
					if (i + 1 < l) index += columnHeads[i + 1].length;
					if (currentHeader) {
						range.push(index);
						columns[currentHeader] = range;
					}
				}
				// Split the "CONCORDANCIA" column into context and sample.
				range = [
					anchorParts[0].length,
					anchorParts[0].length + anchorParts[1].length
				];
				columns.sample = range;
				// Substract 5 to remove the asterisks and trailing space.
				columns.contextRight = [range[1], columns.contextLeft[1] - 5];
				columns.contextLeft[1] = range[0];
				return columns;
			},
			// bind scrape1line to an object with `.columns` and `.minLength`
			scrape1line: function(line) {
				if (line.length < this.minLength) return;
				data.push([
					line.slice.apply(line, this.columns.number),
					line.slice.apply(line, this.columns.date),
					line.slice.apply(line, this.columns.text),
					line.slice.apply(line, this.columns.contextLeft),
					line.slice.apply(line, this.columns.sample),
					line.slice.apply(line, this.columns.contextRight),
				]);
			},
			scrape1page: function(doc) {
				var section = doc.querySelector('tt');
				if (!section) {
					console.log('Error: page', progress, 'does not contain data in the expected format.');
					return;
				}
				var lines = section.textContent.split('\n'),
				    firstLine = lines.shift(),
				    columns = this.columnPositions(section, firstLine);
				lines.forEach(this.scrape1line, {
					columns: columns,
					minLength: columns.text[1],
				});
			},
		},
		'web.frl.es': {
			columns: [
				'number', 'date', 'source', 'author', 'published', 'country',
				'contextLeft', 'sample', 'contextRight', 'sampleAnalysis',
			],
			init: function() {
				var stepNode = document.getElementById('jsf:import:CNDHEForm:importResultadoConcorView:CNDHEForm:selecTable:htmlOutputText49');
				if (stepNode) {
					progressSteps = Number(stepNode.textContent);
				} else {
					progressSteps = 1;
				}
				target = window;
				this.pagingObject = CAF.model('jsf:import:CNDHEForm:importResultadoConcorView:CNDHEForm:selecTable:comandoAlante');
				this.pagingEventName = 'CAF.Command.actionCompleteListener.#' + this.pagingObject.id;
				this.CREA = this.CORPES;
				this.scrapeRowMeta = this[location.pathname.split('/')[1]];
			},
			fetchNextPage: function(callback) {
				console.log('fetchNextPage', callback, this.pagingObject);
				var self = this;
				var handler = function() {
					Event.Custom.removeListener(self.pagingEventName, handler);
					console.log('handling CAF actionComplete');
					callback(document);
				};
				Event.Custom.addListener(self.pagingEventName, handler);
				self.pagingObject.element.setAttribute('caf:async', true);
				self.pagingObject.go();
			},
			getNext: function() {
				var currentPageNode = document.getElementById('jsf:import:CNDHEForm:importResultadoConcorView:CNDHEForm:selecTable:htmlOutputText4');
				console.log('getNext', progressSteps, Number(currentPageNode.textContent));
				if (
					progressSteps === 1 ||
					progressSteps === Number(currentPageNode.textContent)
				) return;
				return this.fetchNextPage.bind(this);
			},
			CORPES: function(rowID) {
				var date = document.getElementById(rowID + ':htmlOutputText15'),
				    source = document.getElementById(rowID + ':tituloPrincipal'),
				    author = document.getElementById(rowID + ':autorPrincipal'),
				    lugarEdicion = document.getElementById(rowID + ':lugarEdicion'),
				    editorial = document.getElementById(rowID + ':editorial'),
				    fechaPublicacion = document.getElementById(rowID + ':fechaPublicacion'),
				    published,
				    country = document.getElementById(rowID + ':htmlOutputText19');
				date = date ? date.textContent : '';
				source = source ? source.textContent : '';
				author = author ? author.textContent : '';
				lugarEdicion = lugarEdicion ? lugarEdicion.textContent : '';
				editorial = editorial ? editorial.textContent : '';
				fechaPublicacion = fechaPublicacion ? fechaPublicacion.textContent : '';
				published = lugarEdicion + editorial + fechaPublicacion;
				country = country ? country.textContent : '';
				return [date, source, author, published, country];
			},
			CNDHE: function(rowID) {
				var date = document.getElementById(rowID + ':htmlOutputText15'),
				    source = document.getElementById(rowID + ':htmlOutputText591'),
				    author = document.getElementById(rowID + ':htmlOutputText561'),
				    published = document.getElementById(rowID + ':htmlOutputText651'),
				    country = document.getElementById(rowID + ':htmlOutputText19');
				date = date ? date.textContent : '';
				source = source ? source.textContent : '';
				author = author ? author.textContent : '';
				published = published ? published.textContent.replace(/\[|\]/g, '') : '';
				country = country ? country.textContent : '';
				return [date, source, author, published, country];
			},
			scrape1row: function(row) {
				var cells = row.childNodes,
				    number = cells[0].textContent,
				    content = cells[3].querySelectorAll('div span'),
				    contextLeft = content[4].textContent,
				    sample = content[5].textContent,
				    contextRight = content[6].textContent,
				    sampleAnalysis = content[2].textContent.split('-')[1];
				return [number].concat(
					this.scrapeRowMeta(row.id),
					contextLeft, sample, contextRight, sampleAnalysis
				);
			},
			scrape1page: function(doc) {
				var rows = doc.getElementById(
				    	'jsf:import:CNDHEForm:importResultadoConcorView:CNDHEForm:selecTable'
				    ).querySelectorAll('.caf-primary-row'),
				    l, i;
				for (l = rows.length, i = 0; i < l; ++i) {
					data.push(this.scrape1row(rows[i]));
				}
			},
		},
	};
	domains['www.corpusdelespanol.org'] = domains['corpus.byu.edu'];
	domains['www.corpusdoportugues.org'] = domains['corpus.byu.edu'];
	domains['googlebooks.byu.edu'] = domains['corpus.byu.edu'];
	
	var domain = domains[window.location.hostname];
	
	if (!domain) return;

	/* Add jQuery to `window`. When ready, call `continuation`. */
	function insertJQueryThen(continuation) {
		if (window.jQuery) return continuation();
		var scriptnode = document.createElement('script');
		scriptnode.setAttribute('src', '//code.jquery.com/jquery-2.1.1.min.js');
		document.head.appendChild(scriptnode);
		scriptnode.addEventListener('load', function() {
			jQuery.noConflict();  // In case the `$` variable is already used
			continuation();
		});
	}
	
	/* Draw an empty status bar on `target.document`. */
	function createStatusbar() {
		var statuswidget = document.createElement('div'),
		    outerBar = document.createElement('div'),
		    innerBar = document.createElement('div');
		statuswidget.setAttribute('style', 'background: #fff; padding: 20px; border-radius: 10px; z-index: 10; position: fixed; top: 50px; right: 50px;');
		outerBar.setAttribute('style', 'width: 100px; height: 10px; border: 2px solid black;');
		innerBar.setAttribute('id', 'progress-fill');
		innerBar.setAttribute('style', 'width: 0%; height: 100%; background: #d10');
		outerBar.appendChild(innerBar);
		statuswidget.appendChild(outerBar);
		target.document.body.appendChild(statuswidget);
	}
	
	/* Increment `progress` and fill the status bar accordingly. */
	function updateStatusbar() {
		var percentage = ++progress / progressSteps * 100;
		target.document.querySelector('#progress-fill').style.width = percentage + '%';
	}
	
	function retrieveAndProceed(href, continuation) {
		window.jQuery.get(href, function(data) {
			var docElem = parser.parseFromString(data, 'text/html');
			continuation(docElem);
		});
	}
	
	function sanitize(csvValue) {
		if (typeof csvValue !== 'string') return csvValue;
		var sanitized = csvValue.trim().split('"').join('""');
		if (sanitized.match(csvSpecial)) return '"' + sanitized + '"';
		return sanitized;
	}
	
	function serialize(csvRow) {
		if (csvRow.length !== domain.columns.length) {
			console.log('Error: subarray of incorrect length.\n', csvRow);
		}
		return csvRow.map(sanitize).join(';');
	}

	/* Encode the extracted data as CSV and present it to the user. */
	function exportCSV() {
		console.log(data);
		// filter below removes mysterious undefined elements that
		// creep into the array
		var rows = data.filter(function(elem) { return elem; }).map(serialize),
		    $ = window.jQuery,
		    body = $(target.document.body);
		body.empty().text(
			'Scraping complete. Please copy the contents below ' +
			'into a plaintext document and give it a .csv extension.'
		).append('<br>');
		$('<textarea>').css({width: '50ex', height: '10em'}).text(
			domain.columns.join(';') + '\n' +
			rows.join('\n')
		).appendTo(body).focus().select();
	}
	
	/*
		A "lazy loop": scrape pages until there are no more.
		Looks like recursion but isn't, because of the JavaScript event model.
	*/
	function scrape(doc) {
		console.log(doc);
		var start = new Date(),
		    next = domain.getNext(doc),
		    wait;
		domain.scrape1page(doc);
		updateStatusbar();
		wait = Math.max(0, 500 - (new Date() - start));
		switch (typeof next) {
		case 'string':
			window.setTimeout(retrieveAndProceed, wait, next, scrape);
			break;
		case 'function':
			window.setTimeout(next, wait, scrape);
			break;
		default:
			exportCSV();
		}
	}

	domain.init();
	createStatusbar();
	insertJQueryThen(function() { scrape(target.document); });
}());
