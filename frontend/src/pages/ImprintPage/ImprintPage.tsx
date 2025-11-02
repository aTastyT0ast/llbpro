import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card.tsx";

export const ImprintPage = () => {
    return (
        <div className={"px-4 text-xxl overflow-y-auto flex flex-col items-center w-full  mb-[142px] iphone-bottom-padding"}>
            <h1 className={"my-8"}>Imprint</h1>
            <Card className={"mb-4"}>
                <CardHeader>
                    <CardTitle>Disclaimer</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>This website is property of aTastyT0ast. It is not affiliated with Team Reptile.</p>
                </CardContent>
            </Card>
            <Card className={"mb-4"}>
                <CardHeader>
                    <CardTitle>Liability for Content</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>The content of our pages was created with the utmost care. However, we cannot guarantee the
                        accuracy, completeness, or timeliness of the content. As a service provider, we are responsible
                        for our own content on these pages. We are not obligated, as a service provider, to monitor
                        transmitted or stored external information or to investigate circumstances
                        that indicate illegal activity. Obligations to remove or block the use of information under
                        general laws remain unaffected by this. However, liability in this respect is only possible from
                        the point in time at which we become aware of a specific legal violation. Upon becoming aware of
                        such violations, we will promptly remove the content in question.</p>
                </CardContent>
            </Card>
            <Card className={"mb-4"}>
                <CardHeader>
                    <CardTitle>Liability for Links</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>The website contains links to external websites of third parties, the content of which we have no
                        control over. Therefore, we cannot assume any liability for this external content. The
                        respective provider or operator of the linked pages is always responsible for their content. The
                        linked pages were checked for possible legal violations at the time of linking. Illegal content
                        was not recognizable at the time of linking. Permanent content monitoring of the linked pages
                        is, however, unreasonable without concrete evidence of a violation of the law. Upon becoming
                        aware of any legal violations, we will promptly remove such links.</p>
                </CardContent>
            </Card>

        </div>)
}
