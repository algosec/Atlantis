import * as chai from 'chai';
import chaiHttp = require('chai-http');
import * as assert from "assert";
import {versionToDisplayName} from "../src/utils/build-parser";

// Configure chai
chai.use(chaiHttp);
chai.should();

describe("Backend", () => {

    describe("sanity", () => {

        it("1+1 should be equal 2", () => {
            assert.strictEqual(1+1, 2);
        });

    });


    describe("build-parser", () => { //todo

        it("versionToDisplayName", () => {
            assert.strictEqual(versionToDisplayName("3000.10"), "A30.10");
            assert.strictEqual(versionToDisplayName("3200.0"), "A32.0");
            assert.strictEqual(versionToDisplayName("3200.0.5.88"), "A32.0");
        });

    });

});
