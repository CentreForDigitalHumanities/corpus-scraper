/*
    (c) 2014 Digital Humanities Lab, Faculty of Humanities, Utrecht University
    Author: Julian Gonggrijp, j.gonggrijp@uu.nl
    
    Automated text scraper for Spanish text corpora:
    http://corpus.rae.es/cordenet.html
    http://corpus.rae.es/creanet.html
    http://www.corpusdelespanol.org/
*/

function scrape_cordelesp ( ) {
    'use strict';
    
    // get some jQuery
    var target = frames[6],
        scriptnode = document.createElement('script'),
        subwindow = document.createElement('iframe');
    scriptnode.setAttribute('src', '//code.jquery.com/jquery-2.1.1.min.js');
    target.document.querySelector('body').appendChild(scriptnode);
    scriptnode.addEventListener('load', function(){
        // get the contents of the 9th line
        console.log(target.jQuery('#texto_9').val().split(/<b><u>|<\/u><\/b>/));
        // Companion data are stored in the <tr> with the same number, i.e.
        // #t9. While numbering continues on following pages, the ids of the
        // elements start from 1 again, so datum 101 on the second page will
        // be placed in <tr id="t1"/>.
        var query_list = target.location.search.split('&');
        query_list[0] = 'p=2';
        target.jQuery(subwindow).attr('src', 'x3.asp?' + query_list.join('&'));
        target.jQuery(subwindow).attr('id', 'test');
        target.jQuery('body').append(subwindow);
        subwindow.addEventListener('load', function(){
            console.log(target.jQuery('#test #texto_9').val().split(/<b><u>|<\/u><\/b>/));
        });
    });
}
