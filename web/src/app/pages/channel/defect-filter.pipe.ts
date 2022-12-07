import {Pipe, PipeTransform} from "@angular/core";
import {IDefect} from "../../../../../shared/src/model";


@Pipe({
    name: 'defectFilter'
})

export class DefectFilter implements PipeTransform {
    transform(defects: IDefect[], openDefects: boolean): IDefect[] {
        if(openDefects) {
            return defects.filter(item => item.status != 'Closed' && item.status != 'Resolved');
        }
        else {
            return defects.filter(item => item.status == 'Closed' || item.status == 'Resolved');
        }
    }

}