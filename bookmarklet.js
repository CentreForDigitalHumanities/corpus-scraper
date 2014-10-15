/*
    (c) 2014 Digital Humanities Lab, Faculty of Humanities, Utrecht University
    Author: Julian Gonggrijp, j.gonggrijp@uu.nl
    
    Automated text scraper for Spanish text corpora:
    http://corpus.rae.es/cordenet.html
    http://corpus.rae.es/creanet.html
    http://www.corpusdelespanol.org/
*/

(function ( ) {
    'use strict';

    var target = frames[6],
        p = new DOMParser(),
        data = [],
        progress_steps = 10
        progress = 0;
    
    function create_statusbar ( ) {
        var statuswidget = document.createElement('div');
        statuswidget.setAttribute('style', 'background: #fff; padding: 20px; border-radius: 10px; z-index: 10; position: fixed; top: 50px; right: 50px;');
        statuswidget.innerHTML = (
            '<div style="width: 100px; height: 10px; border: 2px solid black;">'
            + '<div id="progress-fill" style="width: 0%; height: 100%; background: #d10" />'
            + '</div>'
        );
        doc.body.appendChild(statuswidget);
    }
    
    function update_statusbar ( ) {
        var percentage = ++progress / progress_steps * 100;
        doc.querySelector('#progress-fill').style.width = percentage + '%';
    }
    
    function insert_jquery_then (continuation) {
        var scriptnode = document.createElement('script');
        scriptnode.setAttribute('src', '//code.jquery.com/jquery-2.1.1.min.js');
        document.head.appendChild(scriptnode);
        scriptnode.addEventListener('load', continuation);
    }

    function cordelesp_turnpage_then (doc, continuation, alternative) {
        var navtable = doc.querySelectorAll('#zabba table')[1];
        if (! navtable) {
            alternative();
            return;
        }
        var navrow = navtable.querySelectorAll('td')[2],
            anchor = navrow.querySelectorAll('a')[2],
            progress = navrow.childNodes[4].nodeValue.split('/'),
            table = doc.querySelector('#zabba');
        if (Number(progress[0]) < Number(progress[1])) {
            window.jQuery.get(anchor.href, function (data) {
                var next_doc = p.parseFromString(data, 'text/html');
                continuation(next_doc);
            });
        } else {
            alternative();
        }
    }

    function cordelesp_scrape1page (doc) {
        for (var i = 1; i <= 100; ++i) {
            var row = doc.querySelector('#t' + i);
            if (! row) continue;
            var anchors = row.querySelectorAll('a'),
                field = row.querySelector('#texto_' + i),
                rowdata = [];
            if (!anchors || !field || !field.value) continue;
            for (var j = 0; j < 3; ++j) {
                rowdata.push(anchors[j].childNodes[0].nodeValue.trim());
            }
            data.push(rowdata.concat(field.value.split(/<b><u>|<\/u><\/b>/)));
        }
    }

    function scrape_cordelesp (doc) {
        cordelesp_turnpage_then(doc, function (next_doc) {
            cordelesp_scrape1page(next_doc);
            scrape_cordelesp(next_doc);
        }, data2csv);
    }

    function data2csv ( ) {
        console.log(data);
        // step below removes mysterious undefined elements that
        // creep into the array
        data = data.filter(function (elem) { return elem; });
        var text = '';
        for (var l = data.length, i = 0; i < l; ++i) {
            var a = data[i],
                m = a.length;
            if (m != 6) {
                console.log('Error: subarray of incorrect length.\n', a);
                continue;
            }
            text += a[0] + ';' + a[1];
            for (var j = 2; j < m; ++j) {
                text += ';"' + a[j] + '"';
            }
            text += '\n';
        }
        document.write(
            'Scraping complete. Please copy the contents below ' +
            'into a plaintext document and give it a .csv extension.<br>' +
            '<textarea id="output" style="width: 50ex; height: 10em;">' +
            'number;century;text;contextLeft;sample;contextRight\n' +
            text +
            '</textarea>'
        );
        $('#output').focus().select();
    }

    cordelesp_scrape1page(target.document);
    insert_jquery_then(function ( ) { scrape_cordelesp(target.document); });
})();
