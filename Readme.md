CorpusScraper
=============

By [Research Software Lab](https://cdh.uu.nl/about/research-software-lab/), Centre for Digital Humanities, Utrecht University


Motivation
----------

Some online text concordance corpora, such as Corpus del Español, do not offer a button to download your search results in a practical format, effectively expecting you to copy, paste and edit the data manually page by page. CorpusScraper is a bookmarklet that automates that work for you, so saving your search results becomes nearly as easy as if there would be such a button.

See https://centrefordigitalhumanities.github.io/corpus-scraper/ for a full explanation of the usage.


What’s included
---------------

The bookmarklet is written for Chrome and appears to work in Safari and Firefox as well. Internet Explorer seems not to work for most corpora, but your mileage may vary (either way, you should have at least version 9 installed). 

Currently, the script can scrape data from [all byu.edu corpora](http://corpus.byu.edu/) and from Real Academia Española ([CREA](http://corpus.rae.es/creanet.html)/[CORDE](http://corpus.rae.es/cordenet.html)). As of version 2.0, corpora from the Fundación Rafael Lapesa are supported as well ([CORPES](http://web.frl.es/CORPES/view/inicioExterno.view), [CREA](http://web.frl.es/CREA/view/inicioExterno.view), [CNDHE](http://web.frl.es/CNDHE/view/inicioExterno.view)). It is written such that you can add your own implementations for other online concordance corpora.


How to add support for a new online text corpus
-----------------------------------------------

The top anonymous function of the script contains a variable declaration that looks like this:

    var domains = {
        ...
    };

containing key-value pairs that look like this:

    'corpus.example.org': {...}

add such a key-value pair for each domain that you want to add support for, using an existing pair as an example. Note that you can create aliases afterwards if the same implementation works on multiple domains, like in the following line:

    domains['www.corpusdelespanol.org'] = domains['corpus.byu.edu'];

At the very least, the value part should contain the following four members:

    columns: [...]

> An array of strings, representing the names of the columns that will be extracted. This is considered a promise. Every data row that your domain implementation outputs, should have the same length as this array and contain the corresponding fields in the same order.

    init: function ( ) {...}

> Initializes the `target` and `progressSteps` top-level variables. `target` must be set to the innermost frame or window that contains the first page of data, while `progressSteps` should be set to the number of pages to extract from. Make sure to have a special case for when there is only a single page of results with no navigation available (see the Corpus del Español example). 

    getNext: function (doc) {...}

> Returns either the URL to the next page in `doc`, which is a Document object, or a function which accepts a callback, fetches the next document and finally calls the callback with the next document. If there is no next page it returns `undefined`.
> Note that you cannot return the URL simply as `anchor.href`, because Chrome does not add the `href` property to anchor elements when the containing document is parsed in the background without rendering it. Instead, you should return `anchor.getAttribute('href')`.

    scrape1page: function (doc) {...}

> Extracts the data from the page represented by `doc` (again a Document object) and appends those data to the top-level `data` array, one nested array per row (so `data` becomes an array of arrays of strings or numbers). Note that each row should contain the same number of fields in the same order as described in your `columns` member.

Please take note that your custom domain implementation should only use the `target`, `data` and `progressSteps` identifiers from the top-level function. Do not use `window.document` or `window.jQuery`, because that will probably not work out as you expect. You can however use `doc.querySelector` and `doc.querySelectorAll` instead. See http://www.w3.org/TR/selectors-api/ for a specification of these selectors. 
