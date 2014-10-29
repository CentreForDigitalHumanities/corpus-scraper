CorpusScraper
=============

By Digital Humanities Lab, Utrecht University


Motivation
----------

Some online text corpora, such as Corpus del Español, do not offer a button to download your search results in a practical format, effectively expecting you to copy, paste and edit the data manually page by page. CorpusScraper is a bookmarklet that automates that work for you, so saving your search results becomes nearly as easy as if there would be such a button.

See `CorpusScraper.html` for a full explanation of the usage.


What’s included
---------------

The bookmarklet is written for Chrome and appears to work in Safari and Firefox as well. Internet Explorer seems not to work for most corpora, but your mileage may vary (either way, you should have at least version 9 installed). 

Currently, the script can scrape data from [all byu.edu corpuses](http://corpus.byu.edu/) and from Real Academia Española ([CREA](http://corpus.rae.es/creanet.html)/[CORDE](http://corpus.rae.es/cordenet.html)). It is written such that you can add your own implementations for other online word-in-context corpora.


How to complete the installer
-----------------------------

Take the contents of `bookmarklet.js` through a JavaScript minifier of your choice ([packer](http://dean.edwards.name/packer/) by Dean Edwards is known to work). Make sure to change all occurrences of double quotes (`"`) to the HTML-safe `%22`. Then make a copy of `CorpusScraper.html`, edit the copy and replace the part that looks like

    {{{INSERT MINIFIED CODE HERE}}}

by the minified JavaScript code. Save the copy and distribute it to your users, for example by placing it on your website.


How to add support for a new online text corpus
-----------------------------------------------

The top anonymous function of the script contains a variable declaration that looks like this:

    var domains = {
    };

containing key-value pairs that look like this:

    'corpus.example.org': {...}

add such a key-value pair for each domain that you want to add support for, using an existing pair as an example. Note that you can create aliases afterwards if the same implementation works on multiple domains, like in the following line:

    domains['www.corpusdelespagnol.org'] = domains['corpus.byu.edu'];

At the very least, the value part should contain the following three member functions:

    init: function ( ) {...}

> Initializes the `target` and `progressSteps` top-level variables. `target` must be set to the innermost frame or window that contains the first page of data, while `progressSteps` should be set to the number of pages to extract from. Make sure to have a special case for when there is only a single page of results with no navigation available (see the Corpus del Español example). 

    getNextURL: function (doc) {...}

> Localizes the URL to the next page in `doc`, which is a Document object. If there is no next page it returns `undefined`, otherwise it returns the URL.

    scrape1page: function (doc) {...}

> Extracts the data from the page represented by `doc` (again a Document object), appends those data in 6-tuples to the top-level `data` array, and calls `updateStatusbar()` in the end. Take note that those 6-tuples should be arrays given in the order [record number, century, source text title, left context, word match, right context].

Please take note that your custom domain implementation should only use the `target`, `data`, `progressSteps` and `updateStatusbar` identifiers from the top-level function. Do not use `window.document` or `window.jQuery`, because that will probably not work out as you expect. You can however use `doc.querySelector` and `doc.querySelectorAll` instead. See http://www.w3.org/TR/selectors-api/ for a specification of these selectors. 
