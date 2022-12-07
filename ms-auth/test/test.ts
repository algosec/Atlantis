import * as chai from 'chai';
import chaiHttp = require('chai-http');
import * as assert from "assert";

// Configure chai
chai.use(chaiHttp);
chai.should();

describe("Backend", () => {

    describe("sanity", () => {

        it("1+1 should be equal 2", () => {
            assert.strictEqual(1+1, 2);
        });

    });

});