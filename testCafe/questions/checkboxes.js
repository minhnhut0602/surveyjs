import {frameworks, url, setOptions, initSurvey, getSurveyResult} from "../settings";
import {Selector, ClientFunction} from 'testcafe';
const assert = require('assert');
const title = `checkboxes`;

const json = {
    questions: [{
        type: "checkbox",
        name: "car",
        title: "What car are you driving?",
        isRequired: true,
        colCount: 4,
        hasOther: true,
        choices: [
            "None", "Ford", "Vauxhall", "Volkswagen", "Nissan", "Audi", "Mercedes-Benz", "BMW", "Peugeot",
            "Toyota", "Citroen"
        ]
    }]
};

frameworks.forEach( (framework) => {
    fixture `${framework} ${title}`

        .page `${url}${framework}`

        .beforeEach( async ctx => {
            await initSurvey(framework, json);
        });

    test(`choose empty`, async t => {
        const getPosition = ClientFunction(() =>
            document.documentElement.innerHTML.indexOf('Please answer the question'));
        let position;
        let surveyResult;

        await t
            .click(`input[value=Complete]`);

        position = await getPosition();
        assert.notEqual(position, -1);

        surveyResult = await getSurveyResult();
        assert.equal(typeof surveyResult, `undefined`);
    });

    test(`choose value`, async t => {
        let surveyResult;

        await t
            .click(`div:nth-child(5) label input`)
            .click(`input[value=Complete]`);

        surveyResult = await getSurveyResult();
        assert.equal(surveyResult.car, 'Nissan');
    });

    test(`choose several values`, async t => {
        let surveyResult;

        await t
            .click(`div:nth-child(8) label input`)
            .click(`div:nth-child(5) label input`)
            .click(`input[value=Complete]`);

        surveyResult = await getSurveyResult();
        assert.deepEqual(surveyResult.car, ['BMW', 'Nissan']);
    });

    test(`change column count`, async t => {
        const getStyleWidth = ClientFunction(() => document.querySelector(`div[id*=sq_1] div[style*=margin-right]`).style.width);
        let styleWidth = await getStyleWidth();
        assert.equal(styleWidth, '25%');

        await setOptions('car', { colCount: 1 });

        styleWidth = await getStyleWidth();
        assert.equal(styleWidth, '100%');

        await setOptions('car', { colCount: 2 });

        styleWidth = await getStyleWidth();
        assert.equal(styleWidth, '50%');
    });

    test(`change choices order`, async t => {
        const getChoicesCount = ClientFunction(() => document.querySelectorAll(`div[id*=sq_1] div[style*=margin-right]`).length);
        const getFirst = Selector('div[id*=sq_1] div[style*=margin-right]', { index: 0});
        const getSecond = Selector('div[id*=sq_1] div[style*=margin-right]', { index: 1});
        let rnd_count = 0;
        let first, second, first_2;
        let choicesCount = await getChoicesCount();

        // asc
        await setOptions('car', { choicesOrder: "asc" });
        first = await getFirst();
        second = await getSecond();

        assert.equal(first.textContent.trim(), 'Audi');
        assert.equal(second.textContent.trim(), 'BMW');

        // desc
        await setOptions('car', { choicesOrder: "desc" });
        first = await getFirst();
        second = await getSecond();
        assert.equal(first.textContent.trim(), 'Volkswagen');
        assert.equal(second.textContent.trim(), 'Vauxhall');

        // rnd
        if (choicesCount === 1) {
            assert(false, `need to more than one choices`);
        }

        for (let i = 0; i < 15; i++) {
            await setOptions('car', { choicesOrder: "asc" });
            await setOptions('car', { choicesOrder: "random" });
            first_2 = await getFirst();

            if (first.textContent.trim() !== first_2.textContent.trim()) {
                rnd_count++;
            }

            first = first_2;

            if (rnd_count >= 4) {
                break;
            }
        }

        assert(rnd_count >=4 ); // beacuse of 'none', 'asc', 'desc' and if 4 it is really rnd
    });

    test(`check integrity`, async t => {
        let i;
        const getChoicesCount = ClientFunction(() =>
            document.querySelectorAll('div[id*=sq_1] div[style*=margin-right]').length);
        const getChoicesExistence = ClientFunction(() => {
            var choices = ["None", "Ford", "Vauxhall", "Volkswagen", "Nissan", "Audi", "Mercedes-Benz", "BMW", "Peugeot",
                "Toyota", "Citroen", "Other (describe)"];
            var result;
            for (var i = 0; i < choices.length; i++) {
                if (document.documentElement.innerHTML.indexOf(choices[i]) === -1) return false;
            }
            return true;
        });
        let choicesCount, choicesExistence;
        let checkIntegrity = async () => {
            choicesCount = await getChoicesCount();
            assert.equal(choicesCount, 12);
            choicesExistence = await getChoicesExistence();
            assert(choicesExistence);
        };

        await setOptions('car', { choicesOrder: "asc" });
        await checkIntegrity();

        await setOptions('car', { choicesOrder: "desc" });
        await checkIntegrity();

        await setOptions('car', { choicesOrder: "random" });
        await checkIntegrity();
    });

    test(`show "other" choice`, async t => {
        const getPosition = ClientFunction(() => document.documentElement.innerHTML.indexOf('Other'));
        let position;

        await setOptions('car', { hasOther: true });
        position = await getPosition();
        assert.notEqual(position, -1);
    });

    test(`check "other" choice doesn't change order`, async t => {
        const getOtherChoice = Selector(() =>
            document.querySelectorAll(`div[id*=sq_1] div[style*=margin-right]`)[11]);
        let otherChoice;

        await setOptions('car', { hasOther: true });
        await setOptions('car', { choicesOrder: "desc" });

        otherChoice = await getOtherChoice();
        assert.equal(otherChoice.textContent.trim(), 'Other (describe)');
    });

    test(`choose other`, async t => {
        const getOtherInput = Selector(() =>
            document.querySelectorAll("div:nth-child(12) input")[1]);
        let surveyResult;

        await setOptions('car', { hasOther: true });
        await t
            .click(`div:nth-child(12) label input`)
            .typeText(getOtherInput, 'Zaporozec')
            .click(`input[value=Complete]`);

        surveyResult = await getSurveyResult();
        assert.equal(surveyResult.car, 'other');
        assert.equal(surveyResult['car-Comment'], 'Zaporozec');
    });
});
