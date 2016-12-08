/*
	(c) 2014, 2016 Digital Humanities Lab, Utrecht University
	Author: Julian Gonggrijp, j.gonggrijp@uu.nl
	
	Automated word-in-context scraper for text corpora:
	http://corpus.rae.es/cordenet.html
	http://corpus.rae.es/creanet.html
	http://corpus.byu.edu/
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
				'number', 'century', 'text',
				'contextLeft', 'sample', 'contextRight',
			],
			init: function() {
				target = frames[6];
				this.rowsPerPage = frames[2].document.querySelector('#kh').value;
				var navtable = target.document.querySelectorAll('#zabba table')[1];
				if (navtable) {
					var navrow = navtable.querySelectorAll('td')[2];
					progressSteps = Number(navrow.childNodes[4].nodeValue.split('/')[1]);
				} else progressSteps = 1;
			},
			getNextURL: function(doc) {
				var navtable = doc.querySelectorAll('#zabba table')[1];
				if (!navtable) return;
				var navrow = navtable.querySelectorAll('td')[2],
				    anchor = navrow.querySelectorAll('a')[2],
				    currentState = navrow.childNodes[4].nodeValue.split('/');
				if (anchor && Number(currentState[0]) < Number(currentState[1])) {
					return anchor.getAttribute('href');
				}
				// else return undefined
			},
			scrape1page: function(doc) {
				var row, anchors, field, fieldparts, fieldmiddle, rowdata,
				    i, j, l;
				for (i = 1; i <= this.rowsPerPage; ++i) {
					row = doc.querySelector('#t' + i);
					if (!row) continue;
					anchors = row.querySelectorAll('a');
					field = row.querySelector('#texto_' + i);
					rowdata = [];
					if (!anchors || !field || !field.value) continue;
					for (j = 0; j < 3; ++j) {
						rowdata.push(anchors[j].childNodes[0].nodeValue);
					}
					fieldparts = field.value.split(/<b><u>|<\/u><\/b>/);
					fieldmiddle = [];
					for (l = fieldparts.length, j = 1; j < l - 1; ++j) {
						fieldmiddle.push(fieldparts[j]);
					}
					rowdata.push(   fieldparts[0],
					                fieldmiddle.join(''),
					                fieldparts[j]           );
					data.push(rowdata);
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
			getNextURL: function(doc) {
				var anchor = doc.querySelector('td > a');
				if (!anchor || anchor.textContent !== 'Siguiente') return;
				return anchor.getAttribute('href');
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
					switch (columnHeads[i]) {
					// \xBA might be replaced by \ufffd on encoding mismatch.
					case 'N\ufffd':
					case 'N\xBA':
						currentHeader = 'number';
						break;
					case 'A\xD1O':
						currentHeader = 'date';
						break;
					case 'T\xCDTULO':
						currentHeader = 'text';
						break;
					case 'CONCORDANCIA':
						currentHeader = 'contextLeft';
						break;
					default:
						currentHeader = null;
					}
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
			scrape1page: function(doc) {
				var section = doc.querySelector('tt');
				if (!section) {
					console.log('Error: page', progress, 'does not contain data in the expected format.');
					return;
				}
				var lines = section.textContent.split('\n'),
				    columns = this.columnPositions(section, lines[0]),
				    minLength = columns.text[1],
				    line, rowdata, l, i;
				for (l = lines.length, i = 1; i < l; ++i) {
					line = lines[i];
					if (line.length < minLength) continue;
					rowdata = [
						line.slice.apply(line, columns.number),
						line.slice.apply(line, columns.date),
						line.slice.apply(line, columns.text),
						line.slice.apply(line, columns.contextLeft),
						line.slice.apply(line, columns.sample),
						line.slice.apply(line, columns.contextRight),
					];
					data.push(rowdata);
				}
			}
		}
	};
	domains['www.corpusdelespanol.org'] = domains['corpus.byu.edu'];
	domains['www.corpusdoportugues.org'] = domains['corpus.byu.edu'];
	domains['googlebooks.byu.edu'] = domains['corpus.byu.edu'];
	
	var domain = domains[window.location.hostname];
	
	if (!domain) return;

	/* Add jQuery to `window`. When ready, call `continuation`. */
	function insertJQueryThen(continuation) {
		var scriptnode = document.createElement('script');
		scriptnode.setAttribute('src', '//code.jquery.com/jquery-2.1.1.min.js');
		document.head.appendChild(scriptnode);
		scriptnode.addEventListener('load', continuation);
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
		    body = $(document.body);
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
		    nextURL = domain.getNextURL(doc),
		    wait;
		domain.scrape1page(doc);
		updateStatusbar();
		if (nextURL){
			wait = Math.max(0, 500 - (new Date() - start));
			window.setTimeout(retrieveAndProceed, wait, nextURL, scrape);
		} else {
			exportCSV();
		}
	}

	domain.init();
	createStatusbar();
	insertJQueryThen(function() { scrape(target.document); });
}());
