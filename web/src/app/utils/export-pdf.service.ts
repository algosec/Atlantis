import { Injectable } from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {config} from "../app.config";

@Injectable({
  providedIn: 'root'
})
export class ExportPdfService {

  constructor(private http: HttpClient) { }

  exportAndDownload(filename: string): Promise<void> {
    const options = {responseType: 'blob' as 'json'};
    const body = {
      url: window.location.href,
      localStorage: this.getLocalStorage(),
      sessionStorage: this.getSessionStorage()
    };

    return this.http.post<Blob>(`${config.baseUrl}/export-pdf`, body, options)
        .toPromise()
        .then((blob: Blob) => this.downloadFile(filename, blob))
        .then(() => null);
  }

  private downloadFile(filename: string, blob) {
    // It is necessary to create a new blob object with mime-type explicitly set
    // otherwise only Chrome works like it should
    const newBlob = new Blob([blob], { type: "application/pdf" });

    // IE doesn't allow using a blob object directly as link href
    // instead it is necessary to use msSaveOrOpenBlob
    if (window.navigator && window.navigator.msSaveOrOpenBlob) {
      window.navigator.msSaveOrOpenBlob(newBlob);
      return;
    }

    // For other browsers:
    // Create a link pointing to the ObjectURL containing the blob.
    const data = window.URL.createObjectURL(newBlob);

    const link = document.createElement('a');
    link.href = data;
    link.download = filename + ".pdf";
    // this is necessary as link.click() does not work on the latest firefox
    link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));

    setTimeout(function () {
      // For Firefox it is necessary to delay revoking the ObjectURL
      window.URL.revokeObjectURL(data);
      link.remove();
    }, 100);
  }

  private getSessionStorage() {
    return Object.keys(sessionStorage).reduce((acc, key) => ({ ...acc, [key]: sessionStorage.getItem(key)}), {});
  }

  private getLocalStorage() {
    return Object.keys(localStorage).reduce((acc, key) => ({ ...acc, [key]: localStorage.getItem(key)}), {});
  }
}
