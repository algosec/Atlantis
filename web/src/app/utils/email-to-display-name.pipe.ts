import { Pipe, PipeTransform } from '@angular/core';
import {globalConfig} from "../../../../shared/src/globalConfig";

@Pipe({
  name: 'emailToDisplayName'
})
export class EmailToDisplayNamePipe implements PipeTransform {

  transform(value: string): string {
    return value
        .replace(globalConfig.emailDetails.domain,'')
        .replace(/[^\w]/g, ' ') // remove all non alphanumeric chars
        .replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()); // capitize first letter of each word
  }

}
