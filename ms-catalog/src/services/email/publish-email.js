import log from '../../../../shared/src/utils/log';
import axios from 'axios';
import {globalConfig} from "../../../../shared/src/globalConfig";

// Microsoft Flow end point
const sendMessageUrl = globalConfig.emailDetails.sendMessageUrl

export async function publishEmail(to, subject, body, pdfName, pdfContent) {
    log.info(`Sending email notification to '${to}' with subject: '${subject}'`);
	let res = await axios.post(sendMessageUrl, {
	    to,
        subject,
        body,
        pdfName,
        pdfContent
	});
	return res.data;
}