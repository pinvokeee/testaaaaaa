class Faq {

    faqItems = [];
    categories = [];
    categoryNames = [];
    categoryTree = [];

    constructor(source) {

        const { faqItems, categories, categoryNames } = this.generateFaqData(source);

        this.faqItems = faqItems;
        this.categories = categories;
        this.categoryNames = categoryNames;
        this.categoryTree = this.toCategoryTree(this.categories);
    }

    // クラスのメソッドとして定義
    generateFaqData(data) {

        const lv1Items = [];
        const lv2Items = [];
        const lv3Items = [];
        const faqItems = [];
        const categoryNames = {};

        for (const item of data) {

            let lv1 = lv1Items.find((l) => l.text === item.lv1);

            if (lv1 === undefined) {
                lv1 = { id: crypto.randomUUID(), text: item.lv1, parentId: undefined };
                categoryNames[lv1.id] = item.lv1;
                lv1Items.push(lv1);
            }

            let lv2 = lv2Items.find(
                (l) => l.text === item.lv2 && l.parentId === lv1.id
            );

            if (lv2 === undefined) {
                lv2 = { id: crypto.randomUUID(), text: item.lv2, parentId: lv1.id };
                categoryNames[lv2.id] = item.lv2;
                lv2Items.push(lv2);
            }

            let lv3 = lv3Items.find(
                (l) => l.text === item.lv3 && l.parentId === lv2.id
            );
            if (lv3 === undefined) {
                lv3 = { id: crypto.randomUUID(), text: item.lv3, parentId: lv2.id };
                categoryNames[lv3.id] = item.lv3;
                lv3Items.push(lv3);
            }

            faqItems.push({ ...item, lv1: lv1.id, lv2: lv2.id, lv3: lv3.id });
        }

        return {
            categories: [...lv1Items, ...lv2Items, ...lv3Items],
            faqItems,
            categoryNames,
        };
    }

    // クラスのメソッドとして定義
    toCategoryTree(categories) {
        const getFromParentId = (id) => {
            return categories
                .filter((item) => item.parentId === id)
                .map((item) => {
                    const children = getFromParentId(item.id);
                    return {
                        item,
                        children: children.length > 0 ? children : undefined,
                    };
                });
        };

        return categories
            .filter((item) => item.parentId === undefined)
            .map((item) => ({ item, children: getFromParentId(item.id) }));
    }

    // クラスのメソッドとして定義
    matchTextArray(textList, source) {

        if (!source) return false;
        for (const text of textList) {
            if (
                source.indexOf(text) === -1 &&
                source.indexOf(text.toUpperCase()) === -1 &&
                source.indexOf(text.toLowerCase()) === -1
            )
                return false;
        }
        return true;
    }

    // クラスのメソッドとして定義
    split2(text, delimiter) {
        const result = [];
        let pre = 0;
        let index = text.indexOf(delimiter);

        while (index > -1) {
            if (index > pre) {
                result.push({ index: pre, text: text.substring(pre, index) });
            }
            result.push({ index, text: delimiter });

            pre = index + delimiter.length;
            index = text.indexOf(delimiter, pre);
        }

        if (pre < text.length) {
            result.push({ index: pre, text: text.substring(pre, text.length) });
        }
        return result;
    }

    // クラスのメソッドとして定義
    getHighlightTextStructure2(source) {
        if (!source) return [];
        const urlRegexes = [...source.matchAll(/https?:\/\/[^\s"']+/g)];
        const a = [];
        let last = 0;

        for (const reg of urlRegexes) {
            const { index } = reg;
            const value = reg[0];

            if (index > last) {
                a.push({
                    text: source.substring(last, index),
                    index: last,
                    link: false,
                });
            }

            a.push({
                text: source.substring(index, index + value.length),
                index,
                link: true,
                url: value,
                startLink: true,
                endLink: true,
            });

            last = index + value.length;
        }

        if (last < source.length) {
            a.push({ text: source.substring(last), index: last, link: false });
        }
        return a;
    }

    // クラスのメソッドとして定義
    getHighlightTextStructure(keywords, source) {
        if (!source) return undefined;
        const a = this.getHighlightTextStructure2(source);

        if (keywords.length === 0) return a;

        for (const keyword of keywords) {
            for (let k = 0; k < a.length; k++) {
                const current = a[k].text;
                if (current.indexOf(keyword) > -1) {
                    const splitResult = this.split2(current, keyword).map(
                        ({ index, text }) => ({
                            index,
                            isHighlightTarget: keyword === text,
                            text,
                            link: a[k].link,
                            url: a[k].url,
                        })
                    );
                    a.splice(k, 1, ...splitResult);
                    k += splitResult.length - 1;
                }
            }
        }

        for (let i = 0; i < a.length; i++) {
            a[i].startLink = i > 0 && !a[i - 1]?.link;
            a[i].endLink = i < a.length - 1 && !a[i + 1]?.link;
        }

        return a;
    }

    // クラスのメソッドとして定義
    highlightKeywords(keywords, item) {
        return {
            question: this.getHighlightTextStructure(keywords, item.question),
            answer: this.getHighlightTextStructure(keywords, item.answer),
            memo: this.getHighlightTextStructure(keywords, item.memo),
        };
    }

    // クラスのメソッドとして定義
    filterItems(keyword, items, serachTargets, selectedCategories, categoryNames) {

        const faqItems = [];
        const highlightDataItems = [];
        const keywords = (keyword ?? "").split(/\s/).filter((k) => k.length > 0) ?? [];
        const filterCategories = [];

        for (const item of items) {
            const matched = {
                isQuestion: serachTargets.includes("Question") && this.matchTextArray(keywords, item.question ?? ""),
                isAnswer: serachTargets.includes("Answer") && this.matchTextArray(keywords, item.answer ?? ""),
                isNumber: serachTargets.includes("通し番号") && this.matchTextArray(keywords, item.number ?? ""),
                isLv1: serachTargets.includes("区分1") && this.matchTextArray(keywords, categoryNames[item.lv1]),
                isLv2: serachTargets.includes("区分2") && this.matchTextArray(keywords, categoryNames[item.lv2]),
                isLv3: serachTargets.includes("区分3") && this.matchTextArray(keywords, categoryNames[item.lv3]),
                isMemo: serachTargets.includes("メモ欄") && this.matchTextArray(keywords, item.memo ?? ""),
            };

            const isMatched = Object.values(matched).find((m) => m) || keywords.length === 0;

            if (isMatched) {
                const selectedLv1 = selectedCategories.includes(item.lv1);
                const selectedLv2 = selectedCategories.includes(item.lv2);
                const selectedLv3 = selectedCategories.includes(item.lv3);

                if (selectedLv1 && selectedLv2 && selectedLv3) {
                    faqItems.push(item);

                    const h = this.highlightKeywords(keywords, item);
                    highlightDataItems.push(h);
                }

                if (!filterCategories.includes(item.lv1)) filterCategories.push(item.lv1);
                if (!filterCategories.includes(item.lv2)) filterCategories.push(item.lv2);
                if (!filterCategories.includes(item.lv3)) filterCategories.push(item.lv3);
            }
        }

        return { faqItems, highlightDataItems, categories: filterCategories };
    }

    // クラスのメソッドとして定義
    filterFromCategoryId(categories, targetId) {
        const children = this.getChildren(categories, targetId);
        const parents = this.getParents(categories, targetId);
        const targetIds = [...children, targetId, ...parents];
        return { children, parents };
    }

    // クラスのメソッドとして定義
    getParents(c, id) {
        const parentItem = c.find((item) => item.id === id);
        const results = [];
        if (parentItem && parentItem.parentId) {
            results.push(parentItem.parentId);
            results.push(...this.getParents(c, parentItem.parentId));
        }
        return results;
    }

    // クラスのメソッドとして定義
    getChildren(c, id) {
        const items = c.filter((item) => item.parentId === id);
        const results = [];
        for (const item of items) {
            results.push(item.id);
            results.push(...this.getChildren(c, item.id));
        }
        return results;
    }

}