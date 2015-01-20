var login = require('../tests_util/login');

casper.test.begin('Login/logout', function suite(test) {

    login(casper, test);

    casper.thenClick('a[href="#logout"]');

    casper.waitForUrl(/#login$/);

    casper.then(function() {

        test.assertSelectorHasText('h2', 'Login');

        var key = casper.page.evaluate(function() {

            return sessionStorage.getItem('api-key') || '';

        });

        test.assert(key.length === 0);
    });

    casper.run(function() {

        test.done();
    });
});
