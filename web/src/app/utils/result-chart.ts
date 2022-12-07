import {ChartOptions, ChartType} from "chart.js";
import {Label} from "ng2-charts";
import {ICard} from "../../../../shared/src/model";

export interface ChartDefinition {
    pieChartOptions: ChartOptions;
    pieChartLabels: Label[];
    pieChartData: number[];
    pieChartType: ChartType;
    pieChartLegend;
    pieChartPlugins;
    pieChartColors;
    height?: number;
}

export function prettyPercentage(n: number): number {
    const res = Math.round(n * 10000) / 100;
    return isNaN(res) ? 0 : res;
}

export class ResultsSummary {
    passed = 0;
    skipped = 0;
    failed = 0;
    skippedByUser = 0;

    public add(card: ICard): void {
        this.passed += card.passed;
        this.skipped += card.skipped;
        this.failed += card.failed;
    }

    public totalTestCases(): number {
        return this.passed + this.failed + this.skipped + this.skippedByUser;
    }

    public calculatePercentage(n: number): number {
        return prettyPercentage(n / (this.passed + this.skipped + this.skippedByUser + this.failed));
    }

    public calculatePassRate(): number {
        return this.calculatePercentage(this.passed + this.skippedByUser);
    }

    public calculateFailureAndSkippedRate(): number {
        return this.calculatePercentage(this.failed + this.skipped);
    }

    calculatePassRateClass(): string {
        const percentage = this.calculatePassRate();
        if (percentage >= 97) {
            return "pass";
        } else if (percentage >= 85) {
            return "skip";
        } else {
            return "fail";
        }
    }

}

export function createSummaryChart(type: ChartType, title: string, summary: ResultsSummary): ChartDefinition {
    const labels: string[] = [];
    const data: number[] = [];

    if (summary.passed) {
        labels.push(`Passed - ${summary.calculatePercentage(summary.passed)}%`);
        data.push(summary.passed);
    }
    if (summary.failed) {
        labels.push(`Failed - ${summary.calculatePercentage(summary.failed)}%`);
        data.push(summary.failed);
    }
    if (summary.skipped) {
        labels.push(`Skipped - ${summary.calculatePercentage(summary.skipped)}%`);
        data.push(summary.skipped);
    }
    if (summary.skippedByUser) {
        labels.push(`Skipped By User - ${summary.calculatePercentage(summary.skippedByUser)}%`);
        data.push(summary.skippedByUser);
    }


    return {
        pieChartLabels: labels,
        pieChartData: data,
        pieChartType: type,
        pieChartLegend: true,
        pieChartPlugins: [],
        pieChartColors: [
            {
                backgroundColor: ['#228B2280', '#FF000080', '#FF8C0080', '#58595B80'],
                hoverBackgroundColor: ['#228B22', '#FF0000', '#FF8C00', '#58595B'],
            },
        ],
        pieChartOptions: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    top: 0,
                    bottom: 10,
                    left: 15
                }
            },
            legend: {
                position: 'left',
                labels: {
                    usePointStyle: true
                }
            },
            title: {
                text: title,
                display: true
            },
            tooltips: {
                callbacks: {
                    label: (tooltipItem, data) => {
                        const currentValue = data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index];
                        return `${currentValue} tests`;
                    },
                    title: (tooltipItem, data): string => {
                        return data.labels[tooltipItem[0].index] as string;
                    }
                }
            }
        },
    };
}

export  function createFailuresAmountChart(type: ChartType, title: string, failues: Map<string, number>): ChartDefinition {
    const labels: string[] = [];
    const data: number[] = [];

    const keys: {title, failures}[] = [];
    let total = 0;

    failues.forEach((value, key) => {
        keys.push({title: key, failures: value});
        total += value;
    });

    if (total === 0) {
        return null;
    }

    keys.sort((a,b) => b.failures - a.failures)
        .forEach(pair => {
            const currentLabel = `${pair.title} - ${prettyPercentage(pair.failures / total)}%`;
            labels.push(currentLabel.padEnd(100, ' ')); // pad with spaces, so each label will be in its own line
            data.push(pair.failures);
        });

    return {
        height: 100 + 17*labels.length,
        pieChartLabels: labels,
        pieChartData: data,
        pieChartType: type,
        pieChartLegend: true,
        pieChartPlugins: [],
        pieChartColors: [],
        pieChartOptions: {
            responsive: true,
            layout: {

            },
            legend: {
                position: 'bottom',
                align: "start"
            },
            title: {
                text: title,
                display: true
            },
            tooltips: {
                callbacks: {
                    label: (tooltipItem, data) => {
                        const currentValue = data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index];
                        return `${currentValue} tests`;
                    },
                    title: (tooltipItem, data): string => {
                        return data.labels[tooltipItem[0].index] as string;
                    }
                }
            }
        },
    };
}