import * as ACData from "adaptivecards-templating";

export function cardTemplateBinder(cardTemplate: unknown, cardData: unknown): string {
    // Create a Template instance from the template payload
    const template = new ACData.Template(cardTemplate);

    // Create a data binding context, and set its $root property to the
    // data object to bind the template to
    const context: ACData.IEvaluationContext = {
        $root: cardData
    };

    // "Expand" the template - this generates the final Adaptive Card,
    // ready to render
    return template.expand(context);
}